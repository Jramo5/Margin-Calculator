![Version](https://img.shields.io/badge/version-1.0.0-success)
![Responsive](https://img.shields.io/badge/Responsive-Yes-brightgreen)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-yellow)
![License](https://img.shields.io/badge/License-PolyForm%20Noncommercial%201.0.0-blue)
![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)

# Margin Calculator

A modern and responsive web application for calculating retail and wholesale prices based on product cost and profit margins.

This calculator uses a unique wholesale pricing model where discounts are applied **only to the profit margin**, never to the original product cost.

---

## Features

* Calculate retail prices from product cost and margin percentage.
* Calculate wholesale prices by reducing only the added margin.
* Real-time automatic calculations.
* Modern and responsive user interface.
* Input validation.
* Lightweight and fast.
* Built with pure HTML, CSS and JavaScript.
* No dependencies or frameworks.

---

## How It Works

### Retail Price

The retail price is calculated by adding a profit margin to the product cost.

Formula:

Retail Price = Cost + (Cost × Margin%)

---

### Wholesale Price

The wholesale discount is applied only to the profit margin, not to the original cost.

Formula:

Margin = Cost × Margin%

Discount on Margin = Margin × Wholesale Discount%

Final Margin = Margin − Discount on Margin

Wholesale Price = Cost + Final Margin

---

## Example

Product Cost: $10.00

Margin: 50%

Wholesale Discount: 25%

Results:

* Margin Added: $5.00
* Retail Price: $15.00
* Discount on Margin: $1.25
* Final Margin: $3.75
* Wholesale Price: $13.75

---

## Technologies

* HTML5
* CSS3
* Vanilla JavaScript

---

## Project Structure

```text
MarginCalculator/
│
├── index.html
├── style.css
├── script.js
├── README.md
└── LICENSE
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/your-username/margin-calculator.git
```

Open:

```text
index.html
```

No installation or dependencies required.

---

## Usage

1. Enter the product cost.
2. Enter the desired profit margin percentage.
3. Enter the wholesale discount percentage.
4. View the calculated retail and wholesale prices instantly.

---

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0.

You are permitted to:

* Use the software for personal purposes.
* Use the software for educational purposes.
* Study the source code.
* Modify the source code.
* Share copies of the software.

You are NOT permitted to:

* Sell this software.
* Include this software in paid products.
* Offer this software as a paid service.
* Use this software directly or indirectly for commercial purposes.
* Remove or alter copyright notices.
* Remove author attribution.

Any modified or redistributed version must retain:

* Original copyright notices.
* Original author attribution.
* License information.

Commercial use requires prior written permission from the copyright holder.

For commercial licensing inquiries, please contact the author.

---

## Copyright

© 2026 Jorge Ramos

All rights reserved except as granted under the PolyForm Noncommercial License 1.0.0.

---

## Author

Jorge Ramos

Made with ❤️ for developers, entrepreneurs and small businesses.
