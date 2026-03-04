"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Send, X, Sparkles, Search, ShoppingCart, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getProducts } from "@/lib/products"
import { useCart } from "@/contexts/cart-context"
import type { Product as CartProduct } from "@/types/cart"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  products?: any[]
}

export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content:
        "Hi there! I'm RunAsh AI Assistant. How can I help you today? You can ask me about products, recommendations, or help with your shopping.",
      role: "assistant",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const { addToCart } = useCart()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSendMessage = () => {
    if (message.trim() === "") return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setMessage("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(message)
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  // Generate AI response based on user message
  const generateAIResponse = (userMessage: string): Message => {
    const lowerCaseMessage = userMessage.toLowerCase()
    const allProducts = getProducts()

    // Product search
    if (
      lowerCaseMessage.includes("search") ||
      lowerCaseMessage.includes("find") ||
      lowerCaseMessage.includes("looking for")
    ) {
      const searchTerms = lowerCaseMessage
        .split(/\s+/)
        .filter(
          (term) =>
            term.length > 3 &&
            !["search", "find", "looking", "for", "products", "about", "with", "that", "have", "show", "me"].includes(
              term,
            ),
        )

      if (searchTerms.length > 0) {
        const matchedProducts = allProducts
          .filter((product) =>
            searchTerms.some(
              (term) =>
                product.name.toLowerCase().includes(term) ||
                product.description.toLowerCase().includes(term) ||
                product.tags.some((tag) => tag.toLowerCase().includes(term)),
            ),
          )
          .slice(0, 3)

        if (matchedProducts.length > 0) {
          return {
            id: Date.now().toString(),
            content: `I found these products that match your search:`,
            role: "assistant",
            timestamp: new Date(),
            products: matchedProducts,
          }
        }
      }
    }

    // Product recommendations
    if (lowerCaseMessage.includes("recommend") || lowerCaseMessage.includes("suggestion")) {
      const randomProducts = [...allProducts].sort(() => 0.5 - Math.random()).slice(0, 3)

      return {
        id: Date.now().toString(),
        content: `Based on your interests, I recommend these products:`,
        role: "assistant",
        timestamp: new Date(),
        products: randomProducts,
      }
    }

    // Help with shopping
    if (
      lowerCaseMessage.includes("help") &&
      (lowerCaseMessage.includes("shopping") || lowerCaseMessage.includes("buy"))
    ) {
      return {
        id: Date.now().toString(),
        content:
          "I'd be happy to help with your shopping! You can browse products by category, search for specific items, or ask for recommendations. Is there a particular type of product you're interested in?",
        role: "assistant",
        timestamp: new Date(),
      }
    }

    // Default responses
    const defaultResponses = [
      "I'm here to help with your shopping experience. You can ask me about products, get recommendations, or search for specific items.",
      "Feel free to ask me about our product categories, current promotions, or if you need help finding something specific.",
      "I can help you find the perfect product. Just let me know what you're looking for or what features are important to you.",
      "Is there a specific category or type of product you're interested in? I can provide recommendations based on your preferences.",
    ]

    return {
      id: Date.now().toString(),
      content: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
      role: "assistant",
      timestamp: new Date(),
    }
  }

  const toCartProduct = (product: any): CartProduct => ({
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    category: {
      id: String(product.category).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: String(product.category),
    },
    isOrganic: Boolean(product.isOrganic),
    sustainabilityScore: 0,
    image: product.images?.[0] || "/placeholder.svg",
    inStock: product.stock > 0,
    certifications: product.certifications || [],
  })

  const handleAddToCart = (product: any) => {
    addToCart(toCartProduct(product), 1)

    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    })

    // Add AI confirmation message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: `I've added ${product.name} to your cart. Is there anything else you'd like to know about this product or would you like to see more recommendations?`,
        role: "assistant",
        timestamp: new Date(),
      },
    ])
  }

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-orange-500 p-3 shadow-lg hover:bg-orange-600"
      >
        <Bot className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[350px] flex-col shadow-xl sm:w-[400px]">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <AvatarImage src="/placeholder.svg?height=32&width=32&text=AI" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <CardTitle className="text-base">RunAsh Assistant</CardTitle>
                <Badge className="flex items-center gap-1 bg-purple-500">
                  <Sparkles className="h-3 w-3" /> AI
                </Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user" ? "bg-orange-500 text-white" : "bg-zinc-100 dark:bg-zinc-800"
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>

                    {/* Product recommendations */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {msg.products.map((product) => (
                          <div key={product.id} className="flex gap-2 rounded-md bg-white p-2 dark:bg-zinc-900">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-zinc-50 dark:bg-zinc-800">
                              <img
                                src={product.images[0] || "/placeholder.svg"}
                                alt={product.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                {product.name}
                              </h4>
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                ${product.price.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 bg-orange-500 hover:bg-orange-600"
                              onClick={() => handleAddToCart(product)}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div
                      className={`mt-1 text-right text-xs ${
                        msg.role === "user" ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800">
                    <div className="flex items-center gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 dark:bg-zinc-500"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <CardFooter className="border-t p-3">
            <div className="flex w-full items-center gap-2">
              <Button variant="outline" size="icon" className="flex-shrink-0">
                <Search className="h-4 w-4" />
              </Button>
              <Input
                ref={inputRef}
                placeholder="Ask me anything..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />
              <Button
                size="icon"
                className="flex-shrink-0 bg-orange-500 hover:bg-orange-600"
                onClick={handleSendMessage}
                disabled={message.trim() === "" || isTyping}
              >
                {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  )
}
