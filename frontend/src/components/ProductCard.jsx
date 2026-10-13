import React from 'react';

const typeLabel = {
    product: 'Mahsulot',
    hotel_room: 'Xona',
    service: 'Xizmat',
    menu_item: 'Menyu',
    course: 'Kurs'
};

const ProductCard = ({ product }) => {
    const isOut = !product.in_stock;
    const category = typeLabel[product.subcategory] || typeLabel[product.category] || product.subcategory || product.category;

    return (
        <div className={`product-card ${isOut ? 'out-of-stock' : ''}`}>
            <div className="product-header">
                <span className="product-category-badge">{category}</span>
                <span className={`product-stock ${isOut ? 'out' : 'in'}`}>
                    {isOut ? 'Mavjud emas' : 'Mavjud'}
                </span>
            </div>

            <div className="product-name">{product.name}</div>

            {product.brand && (
                <div className="product-brand">{product.brand}</div>
            )}

            <div className="product-desc">{product.description || 'Tavsif yoq'}</div>

            {product.price > 0 && (
                <div className="product-price">
                    {product.price.toLocaleString('uz-UZ')} so'm
                </div>
            )}
        </div>
    );
};

export default ProductCard;
