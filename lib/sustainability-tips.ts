// Sustainability tips
if (
  input.includes("sustainable") ||
  input.includes("eco") ||
  input.includes("environment") ||
  input.includes("carbon")
) {
  return {
    id: Date.now().toString(),
    content: "Here are some practical sustainability tips to help reduce your environmental impact:",
    role: "assistant",
    timestamp: new Date(),
    type: "tip",
    metadata: {
      tips: [
        {
          id: "1",
          title: "Buy Local and Seasonal",
          description:
            "Choose locally grown, seasonal produce to reduce transportation emissions and support local farmers.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        {
          id: "2",
          title: "Reduce Food Waste",
          description: "Plan meals, store food properly, and compost scraps to minimize waste.",
          category: "waste",
          impact: "high",
          difficulty: "medium",
          estimatedSavings: 40,
        },
        {
          id: "3",
          title: "Use Public Transport or Carpool",
          description:
            "Using public transport or carpooling can significantly reduce air pollution and greenhouse gas emissions.",
          category: "transportation",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 50,
        },
        {
          id: "4",
          title: "Conserve Water",
          description:
            "Take shorter showers, fix leaks, and use water-efficient appliances to save water and reduce energy consumption.",
          category: "water",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 15,
        },
        {
          id: "5",
          title: "Recycle and Compost",
          description:
            "Recycle paper, plastic, and glass, and compost food waste to reduce landfill waste and minimize greenhouse gas emissions.",
          category: "waste",
          impact: "high",
          difficulty: "medium",
          estimatedSavings: 30,
        },
        {
          id: "6",
          title: "Use Energy-Efficient Appliances",
          description:
            "Replace traditional incandescent bulbs with LED bulbs and use energy-efficient appliances to reduce energy consumption.",
          category: "energy",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "7",
          title: "Reduce Meat Consumption",
          description:
            "Choose plant-based meals or reduce meat consumption to reduce greenhouse gas emissions from agriculture.",
          category: "food",
          impact: "high",
          difficulty: "hard",
          estimatedSavings: 60,
        },
        {
          id: "8",
          title: "Use Reusable Products",
          description:
            "Use reusable bags, water bottles, and containers to reduce single-use plastic waste and minimize landfill waste.",
          category: "waste",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 35,
        },
        {
          id: "9",
          title: "Buy Organic Fruits and Vegetables",
          description:
            "Choose organic fruits and vegetables to reduce exposure to pesticides and support sustainable agriculture.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "10",
          title: "Purchase Non-GMO and Locally Grown Grains",
          description:
            "Choose non-GMO and locally grown grains to reduce exposure to pesticides and support local farmers.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        {
          id: "11",
          title: "Opt for Dry Fruits and Nuts",
          description:
            "Choose dry fruits and nuts instead of fresh fruits and nuts to reduce water waste and support sustainable agriculture.",
          category: "food",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "12",
          title: "Use Herbs and Spices for Flavor",
          description:
            "Use herbs and spices to add flavor to meals instead of relying on salt and sugar.",
          category: "food",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "13",
          title: "Make Your Own Herbal Tea",
          description:
            "Make your own herbal tea using fresh herbs and spices to reduce packaging waste and support sustainable agriculture.",
          category: "food",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "14",
          title: "Use Leafy Greens in Your Meals",
          description:
            "Use leafy greens in your meals to reduce food waste and support sustainable agriculture.",
          category: "food",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "15",
          title: "Support Local Farmers' Markets",
          description:
            "Support local farmers' markets to reduce transportation emissions and support local farmers.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "16",
          title: "Choose Whole Foods Over Processed Foods",
          description:
            "Choose whole foods over processed foods to reduce packaging waste and support sustainable agriculture.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 40,
        },
        {
          id: "17",
          title: "Use Upcycled and Repurposed Ingredients",
          description:
            "Use upcycled and repurposed ingredients to reduce food waste and support sustainable agriculture.",
          category: "food",
          impact: "high",
          difficulty: "medium",
          estimatedSavings: 50,
        },

        // Sustainability tips

        {
          id: "18",
          title: "Choose Sustainable Melts and Ice Creams",
          description:
            "Choose sustainable melts and ice creams made from natural ingredients and minimal packaging.",
          category: "food",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "19",
          title: "Select Eco-Friendly Cleaning Products",
          description:
            "Choose eco-friendly cleaning products that are free from harsh chemicals and reduce water pollution.",
          category: "home",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 35,
        },
        {
          id: "20",
          title: "Use Energy-Efficient Light Bulbs",
          description:
            "Replace traditional incandescent bulbs with energy-efficient LED bulbs to reduce energy consumption.",
          category: "energy",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "21",
          title: "Conserve Water by Fixing Leaks",
          description:
            "Fixing leaks can save up to 20 gallons of water per day, which can significantly reduce water waste.",
          category: "water",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        {
          id: "22",
          title: "Reduce Paper Waste by Going Digital",
          description:
            "Switch to digital documents and bills to reduce paper waste and minimize the need for paper products.",
          category: "waste",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "23",
          title: "Use Public Transport or Carpool for Work",
          description:
            "Using public transport or carpooling for work can significantly reduce air pollution and greenhouse gas emissions.",
          category: "transportation",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 50,
        },
        {
          id: "24",
          title: "Support Sustainable Agriculture by Buying from Local Farms",
          description:
            "Buying from local farms can reduce transportation emissions and support sustainable agriculture.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "25",
          title: "Create a Sustainable Garden with Native Plants",
          description:
            "Creating a sustainable garden with native plants can reduce water waste and support local biodiversity.",
          category: "garden",
          impact: "medium",
          difficulty: "hard",
          estimatedSavings: 40,
        },
        {
          id: "26",
          title: "Use Eco-Friendly Makeup and Beauty Products",
          description:
            "Choosing eco-friendly makeup and beauty products can reduce water pollution and support sustainable agriculture.",
          category: "beauty",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "27",
          title: "Support Renewable Energy by Investing in Solar Panels",
          description:
            "Investing in solar panels can reduce energy consumption and support renewable energy.",
          category: "energy",
          impact: "high",
          difficulty: "hard",
          estimatedSavings: 60,
        },
        {
          id: "28",
          title: "Reduce Food Waste by Planning Meals and Making a Grocery List",
          description:
            "Planning meals and making a grocery list can reduce food waste and minimize the need for single-use plastics.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 35,
        },
        {
          id: "29",
          title: "Create a Sustainable Home by Using Energy-Efficient Appliances",
          description:
            "Using energy-efficient appliances can reduce energy consumption and minimize greenhouse gas emissions.",
          category: "home",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 40,
        },
        {
          id: "30",
          title: "Support Sustainable Fashion by Buying Second-Hand Clothing",
          description:
            "Buying second-hand clothing can reduce waste and support sustainable fashion.",
          category: "fashion",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        // Sustainability tips

        {
          id: "31",
          title: "Use Public Transport or Bike for Short Trips",
          description:
            "Using public transport or biking for short trips can reduce air pollution and greenhouse gas emissions.",
          category: "transportation",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 40,
        },
        {
          id: "32",
          title: "Reduce Paper Usage by Switching to Digital Documents",
          description:
            "Switching to digital documents can reduce paper waste and minimize the need for paper products.",
          category: "waste",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 30,
        },
        {
          id: "33",
          title: "Use Energy-Efficient Appliances and Light Bulbs",
          description:
            "Using energy-efficient appliances and light bulbs can reduce energy consumption and minimize greenhouse gas emissions.",
          category: "energy",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 50,
        },
        {
          id: "34",
          title: "Create a Composting System for Food Waste",
          description:
            "Creating a composting system for food waste can reduce landfill waste and minimize greenhouse gas emissions.",
          category: "waste",
          impact: "high",
          difficulty: "medium",
          estimatedSavings: 40,
        },
        {
          id: "35",
          title: "Use Eco-Friendly Cleaning Products and Disinfectants",
          description:
            "Using eco-friendly cleaning products and disinfectants can reduce water pollution and minimize the need for chemical-based products.",
          category: "home",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        {
          id: "36",
          title: "Support Renewable Energy by Investing in Solar Panels",
          description:
            "Investing in solar panels can reduce energy consumption and support renewable energy.",
          category: "energy",
          impact: "high",
          difficulty: "hard",
          estimatedSavings: 60,
        },
        {
          id: "37",
          title: "Reduce Food Waste by Planning Meals and Making a Grocery List",
          description:
            "Planning meals and making a grocery list can reduce food waste and minimize the need for single-use plastics.",
          category: "food",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 35,
        },
        {
          id: "38",
          title: "Create a Sustainable Home by Using Energy-Efficient Appliances",
          description:
            "Using energy-efficient appliances can reduce energy consumption and minimize greenhouse gas emissions.",
          category: "home",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 40,
        },
        {
          id: "39",
          title: "Support Sustainable Fashion by Buying Second-Hand Clothing",
          description:
            "Buying second-hand clothing can reduce waste and support sustainable fashion.",
          category: "fashion",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 25,
        },
        {
          id: "40",
          title: "Use Public Transport or Carpool for Work",
          description:
            "Using public transport or carpooling for work can significantly reduce air pollution and greenhouse gas emissions.",
          category: "transportation",
          impact: "high",
          difficulty: "easy",
          estimatedSavings: 50,
        },
        {
          id: "41",
          title: "Create a Sustainable Garden with Native Plants",
          description:
            "Creating a sustainable garden with native plants can reduce water waste and support local biodiversity.",
          category: "garden",
          impact: "medium",
          difficulty: "hard",
          estimatedSavings: 40,
        },
        {
          id: "42",
          title: "Use Eco-Friendly Makeup and Beauty Products",
          description:
            "Choosing eco-friendly makeup and beauty products can reduce water pollution and support sustainable agriculture.",
          category: "beauty",
          impact: "medium",
          difficulty: "easy",
          estimatedSavings: 20,
        },
        {
          id: "43",
          title: "Support Renewable Energy by Investing in Wind Turbines",
          description:
            "Investing in wind turbines can reduce energy consumption and support renewable energy.",
          category: "energy",
          impact: "high",
          difficulty: "hard",
          estimatedSavings: 70,
        },
        {
          id: "44",
          title: "Reduce Food Waste by Using Upcycled and Repurposed Ingredients",
          description:
            "Using upcycled and repurposed ingredients can reduce food waste and minimize the need for single-use plastics.",
          category: "food",
          impact: "high",
          difficulty: "medium",
          estimatedSavings: 45,
        },
        {
          id: "45",
          title: "Create a Sustainable Home by Using Energy-Efficient Insulation",
          description:
            "Using energy-efficient insulation can reduce energy consumption and minimize greenhouse gas emissions.",
          category: "home",
          impact: "high",
          difficulty: "hard",
          estimatedSavings: 60,
        },
      ],
    },
  };
}
