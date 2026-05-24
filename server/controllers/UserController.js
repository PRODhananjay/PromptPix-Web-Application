import userModel from "../models/userModel.js"
import transactionModel from "../models/transactionModel.js"
import razorpay from "razorpay"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import stripe from "stripe"

// API to register user
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing Details" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET
        )

        res.json({
            success: true,
            token,
            user: { name: user.name },
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({
                success: false,
                message: "User does not exist",
            })
        }

        const isMatch =
            await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign(
                { id: user._id },
                process.env.JWT_SECRET
            )

            res.json({
                success: true,
                token,
                user: { name: user.name },
            })
        } else {
            res.json({
                success: false,
                message: "Invalid credentials",
            })
        }

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// credits
const userCredits = async (req, res) => {
    try {
        const { userId } = req.body

        const user =
            await userModel.findById(userId)

        res.json({
            success: true,
            credits: user.creditBalance,
            user: { name: user.name },
        })

    } catch (error) {
        console.log(error.message)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// razorpay
const razorpayInstance =
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
        ? new razorpay({
              key_id:
                  process.env.RAZORPAY_KEY_ID,
              key_secret:
                  process.env.RAZORPAY_KEY_SECRET,
          })
        : null

// stripe
const stripeInstance =
    process.env.STRIPE_SECRET_KEY
        ? new stripe(
              process.env.STRIPE_SECRET_KEY
          )
        : null

// razorpay payment
const paymentRazorpay = async (req, res) => {
    try {
        if (!razorpayInstance) {
            return res.json({
                success: false,
                message:
                    "Razorpay is not configured",
            })
        }

        const { userId, planId } = req.body

        const userData =
            await userModel.findById(userId)

        if (!userData || !planId) {
            return res.json({
                success: false,
                message: "Missing Details",
            })
        }

        let credits, plan, amount

        switch (planId) {
            case "Basic":
                plan = "Basic"
                credits = 100
                amount = 10
                break

            case "Advanced":
                plan = "Advanced"
                credits = 500
                amount = 50
                break

            case "Business":
                plan = "Business"
                credits = 5000
                amount = 250
                break

            default:
                return res.json({
                    success: false,
                    message: "plan not found",
                })
        }

        const newTransaction =
            await transactionModel.create({
                userId,
                plan,
                amount,
                credits,
                date: Date.now(),
            })

        const options = {
            amount: amount * 100,
            currency: process.env.CURRENCY,
            receipt: newTransaction._id,
        }

        const order =
            await razorpayInstance.orders.create(
                options
            )

        res.json({
            success: true,
            order,
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// verify razorpay
const verifyRazorpay = async (req, res) => {
    try {
        if (!razorpayInstance) {
            return res.json({
                success: false,
                message:
                    "Razorpay is not configured",
            })
        }

        const { razorpay_order_id } =
            req.body

        const orderInfo =
            await razorpayInstance.orders.fetch(
                razorpay_order_id
            )

        res.json({
            success: true,
            orderInfo,
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// stripe payment
const paymentStripe = async (req, res) => {
    try {
        if (!stripeInstance) {
            return res.json({
                success: false,
                message:
                    "Stripe is not configured",
            })
        }

        res.json({
            success: true,
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

// verify stripe
const verifyStripe = async (req, res) => {
    try {
        if (!stripeInstance) {
            return res.json({
                success: false,
                message:
                    "Stripe is not configured",
            })
        }

        res.json({
            success: true,
        })

    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            message: error.message,
        })
    }
}

export {
    registerUser,
    loginUser,
    userCredits,
    paymentRazorpay,
    verifyRazorpay,
    paymentStripe,
    verifyStripe,
}