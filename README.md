# Node_Mailer

# Node_Mailer

Node_Mailer is a Node.js application that facilitates sending One-Time Passwords (OTPs) and emails using templates. It utilizes Express.js for the server framework and Nodemailer for sending emails.

## Features

- Send OTP to users for verification
- Verify OTPs
- Send templated emails with dynamic content
- Handle concurrent email sending with a worker pool

## Technologies Used

- **Node.js**: Runtime for executing JavaScript server-side
- **Express.js**: Web framework for building the server
- **Nodemailer**: Module for sending emails
- **Golang**: For the initial OTP and email sending functionality (in `main.go`)
- **Goroutines**: To handle concurrent processing

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v12 or higher)
- [Go](https://golang.org/doc/install) (if you are running the Go implementation)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Node_Mailer.git
   cd Node_Mailer
