package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"math/rand"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gopkg.in/gomail.v2"
)

var (
	storedOTPs        = make(map[string]otpData)
	emailJobQueue     = make(chan EmailJob, 100) // Buffered channel for email jobs
	wg                sync.WaitGroup
	workerCount       = 5               // Number of email workers
	otpExpirationTime = 5 * time.Minute // 5 minutes
	maxRetries        = 3               // Max retry attempts
)

// Struct to store OTP and expiration
type otpData struct {
	OTP        int
	Expiration time.Time
}

// Job structure for email tasks
type EmailJob struct {
	To      string
	Subject string
	Body    string
	Retries int // Number of retries attempted
}

func main() {
	// Start the worker pool
	startEmailWorkerPool()

	r := gin.Default()

	// Route to send OTP
	r.POST("/send-otp", sendOTP)
	// Route to verify OTP
	r.POST("/verify-otp", verifyOTP)
	// Route to send email using a template
	r.POST("/send-email", sendEmail)

	// Run server
	r.Run(":5000")

	// Wait for all workers to complete before exiting
	wg.Wait()
}

// Starts a pool of workers to handle email jobs
func startEmailWorkerPool() {
	for i := 0; i < workerCount; i++ {
		wg.Add(1) // Add to wait group for each worker
		go emailWorker()
	}
}

// Email worker that processes email jobs from the queue
func emailWorker() {
	defer wg.Done()
	for job := range emailJobQueue {
		retryCount := 0
		for retryCount <= maxRetries {
			err := sendMail(job.To, job.Subject, job.Body)
			if err != nil {
				log.Printf("Error sending email to %s: %v", job.To, err)
				retryCount++
				if retryCount > maxRetries {
					log.Printf("Max retries reached for email to %s. Giving up.", job.To)
					break
				}
				log.Printf("Retrying email to %s (%d/%d)", job.To, retryCount, maxRetries)
				time.Sleep(2 * time.Second) // Simple backoff before retrying
			} else {
				log.Printf("Email sent to %s successfully!", job.To)
				break
			}
		}
	}
}

func sendOTP(c *gin.Context) {
	type OTPRequest struct {
		CustomerEmail string `json:"customerEmail"`
		CustomerName  string `json:"customerName"`
	}
	var req OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing required fields"})
		return
	}

	otp := generateOTP()
	storedOTPs[req.CustomerEmail] = otpData{OTP: otp, Expiration: time.Now().Add(otpExpirationTime)}

	// Load OTP template and replace placeholders
	htmlContent, err := loadTemplate("otp", map[string]string{
		"customerName":     req.CustomerName,
		"otp":              strconv.Itoa(otp),
		"validityDuration": "5 minutes",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error loading OTP template", "error": err.Error()})
		return
	}

	// Send email using job queue
	emailJobQueue <- EmailJob{
		To:      req.CustomerEmail,
		Subject: "Your OTP for Verification",
		Body:    htmlContent,
	}

	c.JSON(http.StatusOK, gin.H{"message": "OTP sent successfully!"})
}

func verifyOTP(c *gin.Context) {
	type VerifyOTPRequest struct {
		CustomerEmail string `json:"customerEmail"`
		OTP           int    `json:"otp"`
	}
	var req VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing required fields"})
		return
	}

	if data, exists := storedOTPs[req.CustomerEmail]; exists {
		if time.Now().After(data.Expiration) {
			delete(storedOTPs, req.CustomerEmail)
			c.JSON(http.StatusBadRequest, gin.H{"message": "OTP has expired"})
			return
		}

		if req.OTP == data.OTP {
			delete(storedOTPs, req.CustomerEmail)
			c.JSON(http.StatusOK, gin.H{"message": "OTP verified successfully!"})
			return
		}
	}

	c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid OTP"})
}

func sendEmail(c *gin.Context) {
	type EmailRequest struct {
		CustomerEmail    string `json:"customerEmail"`
		CustomerName     string `json:"customerName"`
		LeadID           string `json:"leadId"`
		ShareName        string `json:"shareName"`
		LotQty           string `json:"lotQty"`
		LeadCreationDate string `json:"leadCreationDate"`
		TemplateType     string `json:"templateType"`
	}
	var req EmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing required fields"})
		return
	}

	// Load template and replace placeholders
	htmlContent, err := loadTemplate(req.TemplateType, map[string]string{
		"customerName":     req.CustomerName,
		"leadId":           req.LeadID,
		"shareName":        req.ShareName,
		"lotQty":           req.LotQty,
		"leadCreationDate": req.LeadCreationDate,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Error loading template", "error": err.Error()})
		return
	}

	// Send email using job queue
	subject := fmt.Sprintf("Update on Your Request #%s", req.LeadID)
	emailJobQueue <- EmailJob{
		To:      req.CustomerEmail,
		Subject: subject,
		Body:    htmlContent,
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email request received successfully!"})
}

func loadTemplate(templateName string, data map[string]string) (string, error) {
	// Read the template file
	templatePath := filepath.Join("templates", templateName+".html")
	content, err := ioutil.ReadFile(templatePath)
	if err != nil {
		return "", err
	}

	template := string(content)
	// Replace placeholders with actual data
	for key, value := range data {
		placeholder := fmt.Sprintf("{{%s}}", key)
		template = strings.ReplaceAll(template, placeholder, value)
	}
	return template, nil
}

func sendMail(to, subject, body string) error {
	// Create a new email message
	m := gomail.NewMessage()
	m.SetHeader("From", "kushalmehta0309@gmail.com")
	m.SetHeader("To", to)
	m.SetHeader("Subject", subject)
	m.SetBody("text/html", body)

	// Set up the SMTP server configuration
	d := gomail.NewDialer("smtp.gmail.com", 587, "kushalmehta0309@gmail.com", "zzzz zzzz zzzz zzzz")

	// Send the email
	return d.DialAndSend(m)
}

func generateOTP() int {
	rand.Seed(time.Now().UnixNano())
	return rand.Intn(900000) + 100000 // Generates a random 6-digit number
}
