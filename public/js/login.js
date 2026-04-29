document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    const loginError = document.getElementById("loginError");
    const loginForm = document.getElementById("loginForm");

    if (toggle && passwordInput) {
        toggle.addEventListener("click", function () {
            passwordInput.type = passwordInput.type === "password" ? "text" : "password";
            this.textContent = passwordInput.type === "password" ? "Show" : "Hide";
        });
    }

    if (loginForm && loginError) {
        loginForm.addEventListener("submit", function () {
            loginError.textContent = "";
        });
    }
});
