from sqlalchemy.orm import Session

from app.db.models import KnowledgeBlock, Product


def seed_db(db: Session):
    existing_blocks = db.query(KnowledgeBlock).count()
    if existing_blocks:
        return

    products = db.query(Product).all()
    for product in products:
        block = KnowledgeBlock(
            title=product.name,
            type="product",
            description=product.description or "",
            fields={
                "price": product.price,
                "stock": "available" if product.in_stock else "out",
                "category": product.category,
                "subcategory": product.subcategory or "",
                "brand": product.brand or "",
            },
            tags=[
                tag.strip().lower()
                for tag in (product.keywords or "").split(",")
                if tag.strip()
            ],
            status="active" if product.in_stock else "inactive",
        )
        db.add(block)

    db.commit()
