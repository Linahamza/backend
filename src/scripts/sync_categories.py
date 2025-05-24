import psycopg2
import pymongo

# --- Connexion PostgreSQL ---
pg_conn = psycopg2.connect(
    host="localhost",
    port="5432",
    dbname="carrefourv3",
    user="postgres",
    password="123"
)
pg_conn.set_client_encoding('UTF8')
pg_conn.autocommit = False
pg_cursor = pg_conn.cursor()
print("✅ Connexion PostgreSQL réussie.")

# --- Connexion MongoDB ---
MONGO_URI = "mongodb+srv://linacyrine:linacyrine@cluster0.3ozon.mongodb.net/"
client = pymongo.MongoClient(MONGO_URI)
db = client["carrefour"]
collection = db["V3"]
print("✅ Connexion MongoDB réussie.")

# --- Fonction pour obtenir le prochain category_id ---
def get_next_category_id():
    pg_cursor.execute("SELECT COALESCE(MAX(category_id), 0) + 1 FROM product_categories;")
    return pg_cursor.fetchone()[0]

documents = collection.find({}, {"ean": 1, "categories": 1})
compteur = 0
erreurs = 0
category_id_counter = get_next_category_id()
seen_pairs = set()
label_to_id = dict()  # <-- Nouveau dictionnaire

for doc in documents:
    ean = doc.get("ean")
    categories = doc.get("categories", [])
    if not ean or not categories:
        continue

    pg_cursor.execute("SELECT id FROM products WHERE ean = %s;", (ean,))
    product_row = pg_cursor.fetchone()
    if not product_row:
        erreurs += 1
        continue

    product_id = product_row[0]

    for cat in categories:
        label = cat.get("label")
        if not label:
            continue

        if (product_id, label) in seen_pairs:
            continue
        seen_pairs.add((product_id, label))

        # Vérifie si le label existe déjà
        if label in label_to_id:
            category_id = label_to_id[label]
        else:
            category_id = category_id_counter
            label_to_id[label] = category_id
            category_id_counter += 1

        # Insertion
        pg_cursor.execute("""
            INSERT INTO product_categories (product_id, category_id, ean_produit, label_categorie)
            VALUES (%s, %s, %s, %s);
        """, (product_id, category_id, ean, label))
        compteur += 1

        if compteur % 1000 == 0:
            pg_conn.commit()
            print(f"🟡 {compteur} catégories insérées...")

pg_conn.commit()
print(f"✅ Insertion terminée. Total insérées: {compteur}, erreurs (ean non trouvés): {erreurs}")

pg_cursor.close()
pg_conn.close()
client.close()
