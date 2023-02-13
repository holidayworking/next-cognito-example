package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type message struct {
	Message string `json:"message"`
}

func main() {
	e := echo.New()
	m := &message{
		Message: "Hello, World!",
	}
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, m)
	})
	e.Logger.Fatal(e.Start(":1323"))
}
