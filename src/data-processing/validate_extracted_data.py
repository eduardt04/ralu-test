import os
import io
import json
import base64
import openai
from PIL import Image
from pdf2image import convert_from_path

PROJECT_ROOT = "/Users/eduardturtoi/Desktop/ralu-test/"

API_KEY_PATH = PROJECT_ROOT + "api_key.txt"
DATA_DIR = PROJECT_ROOT + "data/"
CHAPTERS_FILEPATH = DATA_DIR + "chapters.json"
CHAPTERS_ID_PATH = DATA_DIR + "chapters_id.json"

finished_pages = 0
total_pages = 0

openai.api_key = open(API_KEY_PATH).read()

def image_to_base64(img: Image.Image):
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def resize_image_if_needed(image, max_base64_len=1_200_000):
    from io import BytesIO
    scale = 1.0
    while True:
        buffer = BytesIO()
        resized = image.resize((int(image.width * scale), int(image.height * scale)))
        resized.save(buffer, format="PNG")
        b64_len = len(base64.b64encode(buffer.getvalue()).decode())
        if b64_len <= max_base64_len or scale <= 0.3:
            return resized
        scale -= 0.05 


def query_llm_with_image_and_text(image: Image.Image, page_text:str):
    b64_image = image_to_base64(image)
    print(len(b64_image))
    
    if len(b64_image) > 1_000_000:
        image = resize_image_if_needed(image)
        b64_image = image_to_base64(image)
    
    print(len(b64_image))

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent care validează informația extrasă dintr-o imagine cu text în limba română."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Aceasta este imaginea în limba română.

Eu am încercat să extrag toată informația din imagine, fără a omite niciun cuvânt, în exact aceeași ordine în care ea apare în pagină, în următorul format:

{page_text}

Compară informația extrasă de mine cu informația pe care o vezi în pagină și te rog corectează orice diferențe între textul original din imagine și textul extras de mine din imagine. Am nevoie ca textul să fie 100% identic cu ce e în pagină, și din păcate prin extragere e posibil să se fi inclus reformulări. 
Te rog fă toate corecțiile necesare acolo unde textul nu e 100% identic cu cel din pagină, și returnează, în același format, conținutul adaptat. Treci prin fiecare cuvânt din imagine și verifică dacă este identic cu cel din textul extras de mine. Nu au voie să apară reformulări, interpretări sau diferențe nici măcar la un cuvânt.
"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{b64_image}"
                        }
                    }
                ]
            }
        ],
        temperature=0.5
    )
    return response.choices[0].message.content


def estimate_cost(image: Image.Image, output_tokens_estimate: int = 1000):
    width, height = image.size
    
    visual_tokens = int((width * height) / (32 * 32))

    cost_per_1k_input = 0.005
    cost_per_1k_output = 0.015

    cost_input = (visual_tokens / 1000) * cost_per_1k_input
    cost_output = (output_tokens_estimate / 1000) * cost_per_1k_output
    total_cost = round(cost_input + cost_output, 4)

    return total_cost


def process_pdf(query_book, query_chapter):    
    global total_pages
    global finished_pages

    pdf_path = f"{DATA_DIR}{query_book}/{chapters_id[query_book][query_chapter]}.pdf"
    extracted_data_path = f"{DATA_DIR}{query_book}/{chapters_id[query_book][query_chapter]}/"
    save_folder_path = f"{DATA_DIR}{query_book}/{chapters_id[query_book][query_chapter]}_validated/"

    if not os.path.exists(save_folder_path):
        os.mkdir(save_folder_path)
    
    pages = convert_from_path(pdf_path, dpi=150)
    total_pages += len(pages)

    for i, page in enumerate(pages):
        if i != 12:
            continue

        page_extracted_data_path = extracted_data_path + f"page_{i+1}.txt"
        page_save_path = save_folder_path + f"page_{i+1}.txt"

        if os.path.exists(page_save_path):
            finished_pages += 1
            
        else:
            print(f"Process page {i+1} / {len(pages)}")
            with open(page_extracted_data_path, "r", encoding="utf-8") as file:
                page_text = file.read()

            result = query_llm_with_image_and_text(page, page_text)

            if len(result) < 200 or result.count("\n") == 0:
                print(f"Process page {i+1} failed.")
                print(result)
            else:
                finished_pages += 1
                with open(page_save_path, "w", encoding="utf-8") as f:
                    f.write(result)


if __name__ == "__main__":
    chapters = json.load(open(CHAPTERS_FILEPATH, "r"))
    chapters_id = json.load(open(CHAPTERS_ID_PATH, "r"))

    # for query_book in ["kumar"]:
    #     for query_chapter in list(chapters_id[query_book]):
    #         print(f"Start validating on {query_book}: {query_chapter}")
    #         process_pdf(query_book, query_chapter)

    #         print("Success rate:", round(finished_pages/total_pages, 2)*100)
    #         break
    #     break

    process_pdf(query_book="kumar", query_chapter="NEUROLOGIE")
