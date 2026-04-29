document.addEventListener("DOMContentLoaded", function () {
    const modalEl = document.getElementById("authorModal");
    if (!modalEl || typeof bootstrap === "undefined") {
        return;
    }

    const authorModal = new bootstrap.Modal(modalEl);
    const modalTitle = modalEl.querySelector("#authorModalTitle");
    const modalImage = modalEl.querySelector("#authorModalImage");
    const modalDates = modalEl.querySelector("#authorModalDates");
    const modalBio = modalEl.querySelector("#authorModalBio");

    const fallbackImage = "/images/tron.png";

    document.querySelectorAll(".authorNames").forEach((link) => {
        link.addEventListener("click", async function (event) {
            event.preventDefault();
            const authorID = this.getAttribute("authorID");
            if (!authorID) {
                return;
            }

            try {
                const response = await fetch(`/api/author/${authorID}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch author data");
                }
                const data = await response.json();
                const authorName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Author";
                const imageSrc = data.portrait || data.image || data.imageURL || data.imageUrl || fallbackImage;
                const birthDate = data.dob || data.birthDate || data.birthdate || data.birth || "";
                const deathDate = data.dod || data.deathDate || data.deathdate || data.death || "";

                if (modalTitle) {
                    modalTitle.textContent = authorName;
                }

                if (modalImage) {
                    modalImage.src = imageSrc;
                    modalImage.alt = authorName;
                }

                if (modalDates) {
                    const dateText = [birthDate, deathDate].filter(Boolean).join(" — ");
                    modalDates.textContent = dateText;
                    modalDates.style.display = dateText ? "block" : "none";
                }

                if (modalBio) {
                    modalBio.textContent = data.biography || data.bio || "Biography not available.";
                }

                authorModal.show();
            } catch (error) {
                console.error("Author modal error:", error);
            }
        });
    });
});
