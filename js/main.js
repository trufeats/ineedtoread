window.onload = function() {
    alert("Hello, welcome to my website!");

    // Array of colors to cycle through.
    var colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];
    var i = 0;

    // Get a reference to the button
    var button = document.getElementById("colorButton");

    // Add a click event listener to the button
    button.addEventListener("click", function() {
        // Change the color of the button
        button.style.backgroundColor = colors[i];

        // Move to the next color, or go back to the first color if we've gone through them all
        i = (i + 1) % colors.length;
    });
    
    document.getElementById('themeToggle').addEventListener('click', function() {
    var body = document.body;
    var newTheme = '';
    var buttonText = '';

    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        newTheme = 'Light';
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        newTheme = 'Dark';
    }

    this.textContent = 'Switch to ' + newTheme + ' Mode';
    });

};
