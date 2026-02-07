// Automation suggestions
if (
  input.includes("automat") ||
  input.includes("business") ||
  input.includes("retail") ||
  input.includes("inventory") ||
  input.includes("optimize") ||
  input.includes("products") ||
  input.includes("sales") ||
  input.includes("profit") ||
  input.includes("efficiency") ||
  input.includes("growth") ||
  input.includes("organic") ||
  input.includes("live") ||
  input.includes("retail") ||
  input.includes("agentic") ||
  input.includes("commerce") ||
  input.includes("streaming") ||
  input.includes("video") ||
  input.includes("real-time")
) {
  return {
    id: Date.now().toString(),
    content: "Here are automation suggestions to optimize your organic retail business:",
    role: "assistant",
    timestamp: new Date(),
    type: "automation",
    metadata: {
      automationSuggestions: [
        {
          id: "1",
          title: "Smart Inventory Management",
          description:
            "Implement AI-powered inventory tracking to predict demand and reduce waste of perishable organic products.",
          category: "inventory",
          complexity: "moderate",
          estimatedROI: 35,
          implementationTime: "2-4 weeks",
          tools: ["RFID tags", "Inventory software", "Demand forecasting AI"],
        },
        {
          id: "2",
          title: "Automated Customer Segmentation",
          description:
            "Use customer data to automatically segment buyers and send personalized organic product recommendations.",
          category: "marketing",
          complexity: "simple",
          estimatedROI: 28,
          implementationTime: "1-2 weeks",
          tools: ["CRM software", "Email automation", "Analytics platform"],
        },
        {
          id: "3",
          title: "E-commerce Website Automation",
          description:
            "Automate order processing, shipping, and customer communication to speed up online sales.",
          category: "e-commerce",
          complexity: "moderate",
          estimatedROI: 40,
          implementationTime: "3-6 weeks",
          tools: ["E-commerce platform", "Order management software", "Shipping integrations"],
        },
        {
          id: "4",
          title: "Automated Social Media Content Creation",
          description:
            "Use AI-powered tools to generate social media content, such as posts, images, and videos, to engage with customers.",
          category: "marketing",
          complexity: "simple",
          estimatedROI: 25,
          implementationTime: "1-2 weeks",
          tools: ["Social media management software", "Content generation AI", "Image and video editing tools"],
        },
        {
          id: "5",
          title: "Predictive Analytics for Demand Forecasting",
          description:
            "Use machine learning algorithms to analyze historical data and predict future demand for organic products.",
          category: "analytics",
          complexity: "advanced",
          estimatedROI: 45,
          implementationTime: "6-12 weeks",
          tools: ["Predictive analytics software", "Machine learning library", "Historical data"],
        },
        {
          id: "6",
          title: "Live Retail Automation",
          description:
            "Automate live retail processes, such as product demonstrations, sales pitches, and customer interactions, using AI-powered chatbots and virtual assistants.",
          category: "live retail",
          complexity: "moderate",
          estimatedROI: 38,
          implementationTime: "4-8 weeks",
          tools: ["AI-powered chatbots", "Virtual assistants", "Live streaming software"],
        },
        {
          id: "7",
          title: "Agentic Commerce Automation",
          description:
            "Automate agentic commerce processes, such as product recommendations, customer segmentation, and sales forecasting, using AI-powered tools and machine learning algorithms.",
          category: "agentic commerce",
          complexity: "advanced",
          estimatedROI: 42,
          implementationTime: "8-16 weeks",
          tools: ["AI-powered tools", "Machine learning algorithms", "Agentic commerce software"],
        },
        {
          id: "8",
          title: "Real-Time Video Generation",
          description:
            "Use AI-powered tools to generate real-time videos for live streaming, product demonstrations, and sales pitches, improving customer engagement and sales.",
          category: "video generation",
          complexity: "moderate",
          estimatedROI: 30,
          implementationTime: "3-6 weeks",
          tools: ["AI-powered video generation software", "Live streaming software", "Video editing tools"],
        },
        {
          id: "9",
          title: "Live Streaming Automation",
          description:
            "Automate live streaming processes, such as video recording, editing, and publishing, using AI-powered tools and machine learning algorithms.",
          category: "live streaming",
          complexity: "moderate",
          estimatedROI: 32,
          implementationTime: "4-8 weeks",
          tools: ["AI-powered live streaming software", "Machine learning algorithms", "Video editing tools"],
        },
        {
          id: "10",
          title: "Agentic Live Commerce Automation",
          description:
            "Automate agentic live commerce processes, such as product recommendations, customer segmentation, and sales forecasting, using AI-powered tools and machine learning algorithms.",
          category: "agentic live commerce",
          complexity: "advanced",
          estimatedROI: 48,
          implementationTime: "10-20 weeks",
          tools: ["AI-powered tools", "Machine learning algorithms", "Agentic live commerce software"],
        },
      ],
    },
  };
}
