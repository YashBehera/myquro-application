const express = require("express");

const app = express();
app.use(express.json());

app.post("/api/orders/make-order", (req, res) => {
  res.status(201).json({
    message: "Order created successfully",
    orderId: "test-order-id",
    totalAmount: 100,
  });
});

app.listen(4001, () => {
  console.log("Test server running on http://localhost:4001");
});