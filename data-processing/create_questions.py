import re, glob, json, os
import openai, tiktoken

PROJECT_ROOT = "/Users/eduardturtoi/Desktop/ralu-test/"

API_KEY_PATH = PROJECT_ROOT + "api_key.txt"
DATA_DIR = PROJECT_ROOT + "data/"
CHAPTERS_FILEPATH = DATA_DIR + "chapters.json"
CHAPTERS_ID_PATH = DATA_DIR + "chapters_id.json"

def read_chapters(query_book, query_chapter):
    chapters_id = json.load(open(CHAPTERS_ID_PATH, "r"))
    data_path = f"{DATA_DIR}{query_book}/{chapters_id[query_book][query_chapter]}/*.txt"
    sorted_paths = sorted(glob.glob(data_path), key=lambda x: int(re.search(r'page_(\d+)\.txt', x).group(1)))

    chapters = []

    for filepath in sorted_paths:
        with open(filepath, "r", encoding="utf-8") as file:
            chapters.append(file.read())

    return chapters


def get_max_prompt_length(prompts):
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    
    max_len = 0
    for prompt in prompts:
        len_ = len(enc.encode(prompt))
        if len_ > max_len:
            max_len = len_
    
    return max_len


def estimate_prompt_cost(prompt_text, model="gpt-4o", estimated_output_length = 1000):
    openai.api_key = open(API_KEY_PATH).read()

    model_prices = {
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-4.1-mini": {"input": 0.01, "output": 0.03},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},  # alias
        "gpt-3.5-turbo": {"input": 0.001, "output": 0.002}
    }

    if model not in model_prices:
        raise ValueError(f"Modelul '{model}' nu este suportat în această funcție.")

    encoding = tiktoken.get_encoding("cl100k_base")
    input_tokens = len(encoding.encode(prompt_text))
    
    estimated_output_tokens = estimated_output_length

    input_cost = (input_tokens / 1000) * model_prices[model]["input"]
    output_cost = (estimated_output_tokens / 1000) * model_prices[model]["output"]
    total_cost = input_cost + output_cost

    return total_cost


def query_llm_with_chapter(chapter, model="gpt-4.1-mini"):
    prompt_text = f"""Aceasta este o pagină a unui manual medical în limba română:
{chapter}

Informația este structurată în următorul format:
Titlu: [...]
Text:
[...]
Tabel:
| ... | ... |
| ... | ... |
[FIGURĂ: nume]
Descriere: [...]
Elemente text: [...]

Folosind această informație, creează câteva grile în următorul format:
[
    {{
        "Întrebare răspuns simplu": "1. Semnul sugestiv dar nediagnostic (de probabilitate) pentru leziunile vasculare în traumatismele extremităților este:",
        "Variante": [
            "A. Hematomul neexpansiv",
            "B. Sângerarea pulsatilă",
            "C. Absenta pulsului la extremități",
            "D. Extremitate palidă, rece",
            "E. Suflu periferic"
        ],
        "Răspunsuri": [
            "A. Hematomul neexpansiv"
        ],
        "Sursa": "[Pasajul / pasajele exacte din pagina de unde s-a extras informația pentru răspunsul / răspunsurile corecte. Pasajul trebuie copiat identic]"    }},
    {{
        "Întrebare răspuns multiplu": "2. Indicați afirmațiile false referitoare la polineuropatia simetrică distală în diabetul zaharat:",
        "Variante": [
            "A. Este recunoscută frecvent de către pacienți în stadiile incipiente",
            "B. Semnele clinice precoce includ pierderea senzației dureroase superficiale înaintea celei profunde",
            "C. Pacienții descriu dureri de tip arsură la nivelul picioarelor",
            "D. Prezentarea este de obicei cu atrofii dureroase, deseori asimetrice ale mușchilor cvadriceps",
            "E. Piciorul poate avea o formă caracteristică cu o boltă înaltă și aspect de gheară al degetelor"
        ],
        "Răspunsuri": [
            "A. Este recunoscută frecvent de către pacienți în stadiile incipiente",
            "B. Semnele clinice precoce includ pierderea senzației dureroase superficiale înaintea celei profunde",
            "C. Pacienții descriu dureri de tip arsură la nivelul picioarelor",
            "D. Prezentarea este de obicei cu atrofii dureroase, deseori asimetrice ale mușchilor cvadriceps"
        ],
        "Sursa": "[Pasajul / pasajele exacte din pagina de unde s-a extras informația pentru răspunsul / răspunsurile corecte. Pasajul trebuie copiat identic]"    }}
]

Indicații pentru crearea grilelor:
- Dacă pagina nu conține informație relevantă (copertă, cuprins, referințe), returnează o listă goală.
- Dacă pagina conține informație relevantă, generează între 3 și 10 întrebări, în funcție de cantitatea de conținut (pagini mai scurte, 3-5 întrebări, pagini mai lungi, 7-10 întrebări).
- Alege conceptele importante din care formulezi întrebări, cu șanse mari să apară la examenul de rezidențiat.
- Prima jumătate din întrebări trebuie să fie cu o singură variantă corectă de raspuns. A doua jumătate din întrebări trebuie să fie variantă multiplă de raspuns.
- Dacă este prezent un tabel, generează minim 2 întrebări din el.
- Include cel puțin o întrebare cu enunț tip negativ („Identificați afirmația falsă”, etc.).
"""

    cost_estimate = estimate_prompt_cost(prompt_text, model=model)
    print("Cost estimate: ", cost_estimate)

    response = openai.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent care creează întrebări grilă pentru examenul de rezidențiat la medicină, folosind informația din pagini de manuale medicale redactate în limba română."
            },
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt_text}]
            }
        ],
        temperature=0.7
    )

    return response.choices[0].message.content


if __name__ == "__main__":
    for query_book in ["kumar"]:
        for query_chapter in ["DIABETUL ZAHARAT", "SEPSISUL ȘI TRATAMENTUL INFECȚIILOR BACTERIENE", "ENDOCRINOLOGIE"]:
            chapter_pages = read_chapters(query_book, query_chapter)

            print(query_chapter)
            for i in range(1, 3):
                print(f"Page {i}")
                qa = query_llm_with_chapter(chapter_pages[i])

                chapters_id = json.load(open(CHAPTERS_ID_PATH, "r"))
                save_path = f"{DATA_DIR}{query_book}/questions/{chapters_id[query_book][query_chapter]}/"

                if not os.path.exists(save_path):
                    os.mkdir(save_path)
                
                with open(f"{save_path}/{i}.txt", "w", encoding="utf-8") as f:
                    f.write(qa)
