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


def resize_image_if_needed(image, max_base64_len=1_000_000):
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
    # print(image.width, image.height)
    b64_image = image_to_base64(image)

    if len(b64_image) > 1_000_000:
        image = resize_image_if_needed(image)
        b64_image = image_to_base64(image)
    
    # print("Image len:", len(b64_image))

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "Ești un asistent care extrage informația din pagini de manuale medicale redactate în limba română."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""Aceasta este pagina {page_num} a unui manual medical în limba română.

Extrage absolut toată informația textuală vizibilă în imagine, fără a omite niciun cuvânt, indiferent unde este localizat în pagină (text, tabel, figură, margine, subsol, etichetă etc).

Format:
Titlu: [...]
Text:
[...]
Tabel:
| ... | ... |
| ... | ... |
[FIGURĂ: nume]
Descriere: [...]
Elemente text: [...]

Dacă există orice fel de text pe pagină (oricât de mic, izolat sau în figură), trebuie inclus 100% în răspuns.
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
        temperature=0.4
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
    save_folder_path = f"{DATA_DIR}{query_book}/{chapters_id[query_book][query_chapter]}/"
    if not os.path.exists(save_folder_path):
        os.mkdir(save_folder_path)
    
    pages = convert_from_path(pdf_path, dpi=200)
    total_pages += len(pages)
    for i, page in enumerate(pages):
        page_save_path = save_folder_path + f"page_{i+1}.txt"
        if os.path.exists(page_save_path):
            finished_pages += 1
            # print(f"Page {i+1} already done.")
        else:
            print(f"Process page {i+1} / {len(pages)}")
            result = query_llm_with_image(page, i+1)
            if len(result) < 100 or result.count("\n") == 0:
                print(f"Process page {i+1} failed.")
                print(result)
            else:
                finished_pages += 1
                with open(page_save_path, "w", encoding="utf-8") as f:
                    f.write(result)


if __name__ == "__main__":
    chapters = json.load(open(CHAPTERS_FILEPATH, "r"))
    chapters_id = json.load(open(CHAPTERS_ID_PATH, "r"))

    for query_book in ["lawrence", "sinopsis"]:
        for query_chapter in list(chapters_id[query_book]):
            print(f"Start working on {query_book}: {query_chapter}")
            process_pdf(query_book, query_chapter)

            print("Success rate:", round(finished_pages/total_pages, 2)*100)
