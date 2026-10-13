import React from 'react';
import ProductCard from './ProductCard';

const ProductGrid = ({ products }) => {
    if (!products || products.length === 0) {
        return (
            <div className="product-sidebar">
                <div className="product-empty" aria-hidden="true" />
            </div>
        );
    }

    return (
        <div className="product-sidebar">
            <div className="product-sidebar-inner">
                <div className="product-grid">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProductGrid;
