document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("productModal");
    const closeModal = document.getElementById("closeModal");
    const modalAddToCart = document.getElementById("modalAddToCart");

    let currentProduct = null;

    /* OPEN MODAL */
    document.querySelectorAll(".product-card img").forEach(img => {
        img.addEventListener("click", () => {
            const card = img.closest(".product-card");

            currentProduct = {
                id: card.dataset.id,
                name: card.dataset.name,
                price: Number(card.dataset.price),
                image: card.dataset.image
            };

            document.getElementById("modalImage").src = currentProduct.image;
            document.getElementById("modalTitle").textContent = currentProduct.name;
            document.getElementById("modalPrice").textContent =
                "₦" + currentProduct.price.toLocaleString();
            document.getElementById("modalDescription").textContent =
                "Naturally processed, healthy Nigerian food product.";

            modal.classList.add("active");
        });
    });

    /* CLOSE MODAL */
    closeModal.addEventListener("click", () => {
        modal.classList.remove("active");
    });

    modal.addEventListener("click", e => {
        if (e.target === modal) {
            modal.classList.remove("active");
        }
    });

   /* NORMAL ADD TO CART BUTTONS */
document.querySelectorAll(".product-card .btn").forEach(button => {
    button.addEventListener("click", e => {
        e.stopPropagation();

        const card = button.closest(".product-card");
        const productId = card.dataset.id;

        addToCart(productId);
        alert("Added to cart");
    });
});
});


