import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# Path to your Firebase service account key
SERVICE_ACCOUNT_PATH = '/Users/eduardturtoi/Desktop/ralu-test/docs/serviceAccountKey.json'  # Place your key in the project root

# Initialize Firebase Admin
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Map chapter names to Firestore collection IDs
chapter_map = {
    '23': 'diabetul_zaharat',
    '8': 'sepsisul',
    '21': 'endocrinologie'
}

# Path to your questions
QUESTIONS_ROOT = os.path.join(os.path.dirname(__file__), '../data/kumar/questions')

for folder, chapter_id in chapter_map.items():
    folder_path = os.path.join(QUESTIONS_ROOT, folder)
    if not os.path.isdir(folder_path):
        continue
    for filename in sorted(os.listdir(folder_path)):
        if filename.endswith('.txt'):
            with open(os.path.join(folder_path, filename), encoding='utf-8') as f:
                questions = json.load(f)
                for idx, q in enumerate(questions):
                    doc_id = f"{filename.replace('.txt','')}_{idx+1}"
                    db.collection('kumar_questions').document(chapter_id).collection('questions').document(doc_id).set(q)

print('Upload complete.')
