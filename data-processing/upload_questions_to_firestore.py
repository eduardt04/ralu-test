import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# Path to your Firebase service account key
SERVICE_ACCOUNT_PATH = '/Users/eduardturtoi/Desktop/ralu-test/docs/serviceAccountKey.json'

# Initialize Firebase Admin
if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Load chapter mappings from chapters_id.json
CHAPTERS_PATH = "/Users/eduardturtoi/Desktop/ralu-test/data/chapters_id.json"
with open(CHAPTERS_PATH, encoding='utf-8') as f:
    chapters_data = json.load(f)

books = {
    'kumar': 'kumar_questions',
    'lawrence': 'lawrence_questions',
    'sinopsis': 'sinopsis_questions'
}

# Path to the file that tracks successful uploads
SUCCESS_PATH = "/Users/eduardturtoi/Desktop/ralu-test/data-processing/success.json"
if os.path.exists(SUCCESS_PATH):
    with open(SUCCESS_PATH, encoding='utf-8') as f:
        success = set(json.load(f))
else:
    success = set()

try:
    for book, collection_name in books.items():
        QUESTIONS_ROOT = os.path.join(os.path.dirname(__file__), f'../data/{book}/questions')
        chapter_map = chapters_data.get(book, {})
        if not os.path.isdir(QUESTIONS_ROOT):
            continue
        for folder in sorted(os.listdir(QUESTIONS_ROOT)):
            folder_path = os.path.join(QUESTIONS_ROOT, folder)
            if not os.path.isdir(folder_path):
                continue
            for filename in sorted(os.listdir(folder_path)):
                file_id = f"{book}/{folder}/{filename}"
                if filename.endswith('.txt'):
                    if file_id in success:
                        print(f"Skipping already uploaded: {file_id}")
                        continue
                    try:
                        with open(os.path.join(folder_path, filename), encoding='utf-8') as f:
                            questions = json.load(f)
                        for idx, q in enumerate(questions):
                            doc_id = f"{filename.replace('.txt','')}_{idx+1}"
                            db.collection(collection_name).document(folder).collection('questions').document(doc_id).set(q)
                        success.add(file_id)
                        with open(SUCCESS_PATH, "w", encoding='utf-8') as f:
                            json.dump(list(success), f, ensure_ascii=False, indent=2)
                        print(f"Uploaded: {file_id}")
                    except Exception as e:
                        print(f"Error processing {file_id}: {e}")
                        raise

    print('Upload complete.')
    
except Exception as e:
    print("Stopped due to error.")
