import pandas as pd
import json
from pdf_helpers import process_pdf

CHAPTERS_FILEPATH = "../data/chapters.json"
CHAPTERS_ID_PATH = "../data/chapters_id.json"

chapters = json.load(open(CHAPTERS_FILEPATH, "r"))
chapters_id = json.load(open(CHAPTERS_ID_PATH, "r"))

book = "kumar"
chapter = "SEPSISUL ȘI TRATAMENTUL INFECȚIILOR BACTERIENE"

def get_data(query_book, query_chapter):
    filepath = f"../data/{book}/{chapters_id[book][chapter]}.pdf"
    return process_pdf(filepath)

data = get_data(
    query_book=book,
    query_chapter=chapter
)

