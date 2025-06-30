import openai
from pdf2image import convert_from_path
from PIL import Image
import io
import base64

openai.api_key = open("../api_key.txt").read()


def image_to_base64(img: Image.Image):
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def resize_image_if_needed(image, max_base64_len=1100000):
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


def query_llm_with_image(image: Image.Image, page_num: int):
    image = resize_image_if_needed(image)
    print(image.width, image.height)
    b64_image = image_to_base64(image)
    print("Image len:", len(b64_image))
    image.save(f"../debug_page_{page_num}.png")

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent care extrage fidel informația din pagini de manuale medicale redactate în limba română."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Aceasta este pagina {page_num} a unui manual medical în limba română.

Te rog să extragi întreaga informație prezentă în pagină, în ordinea exactă în care apare, respectând următorul format:

Titlu: [Titlul paginii, dacă există]

Text:
[Tot textul din pagină, copiat exact așa cum este scris, fără reformulări sau omisiuni.]

Tabel: (dacă există)
| Coloana 1 | Coloana 2 | Coloana 3 ... |
|-----------|-----------|---------------|
| ...       | ...       | ...           |
Valorile din tabel trebuie copiate identic, inclusiv orice notă sau unitate de măsură.

[FIGURĂ: Numele sau legenda figurii]
Descriere: [Descriere logică a figurii - explică ce conține și ce transmite.]
Elemente text: [Enumeră complet toate elementele de tip text din figură: titluri, săgeți, etichete, simboluri, explicații etc.]

Note importante:
- Menține ordinea exactă a elementelor, așa cum apar în pagină. Dacă o figură este intercalată între două blocuri de text, trebuie să apară în același loc și în răspuns.
- Nu omite nicio informație textuală din tabele, imagini sau figuri.
- Nu face parafrazări sau rezumate — toate textele trebuie redate **literal**.

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
        temperature=0.2
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


def process_pdf(pdf_path):
    pdf_text = ""
    pages = convert_from_path(pdf_path, dpi=200)
    pages = pages[:6]
    for i, page in enumerate(pages):
        print(f"Procesare pagină {i+1}...")
        print(f"Cost aprox.:", estimate_cost(page))
        result = query_llm_with_image(page, i+1)
        pdf_text = pdf_text + result + "\n\n"    

    return pdf_text

