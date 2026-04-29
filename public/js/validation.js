document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("searchByKeywordForm");
    const errorEl = document.getElementById("keywordError");

    if (!form || !errorEl) {
        return;
    }

    const keywordInput = form.querySelector("input[name='keyword']");
    if (!keywordInput) {
        return;
    }

    form.addEventListener("submit", function (event) {
        const value = keywordInput.value.trim();
        if (value.length < 3) {
            event.preventDefault();
            errorEl.textContent = "Keyword must be at least 3 characters long.";
            return;
        }

        errorEl.textContent = "";
    });

    keywordInput.addEventListener("input", function () {
        if (this.value.trim().length >= 3) {
            errorEl.textContent = "";
        }
    });
});
