console.log("Script loaded");

function togglePassword(id) {
  var passwordField = document.getElementById(id);
  var passwordFieldType = passwordField.getAttribute("type");
  var toggleIcon = passwordField.nextElementSibling;

  if (passwordFieldType === "password") {
    passwordField.setAttribute("type", "text");
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordField.setAttribute("type", "password");
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  fetch("http://localhost:5000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server Response:", data);

      if (data.message === "Login successful") {
        sessionStorage.setItem("token", data.token);
        const payload = JSON.parse(atob(data.token.split(".")[1]));
        sessionStorage.setItem("userType", payload.userType);
        sessionStorage.setItem("firstname", payload.firstname);
        sessionStorage.setItem("lastname", payload.lastname);

        if (payload.userType === "user") {
          window.location.href = "../User_Login/index.html";
        } else if (payload.userType === "admin") {
          window.location.href = "../index.html";
        }
      } else {
        alert("Invalid login credentials");
      }
    })
    .catch((error) => {
      console.error("Fetch Error:", error);
    });
}
