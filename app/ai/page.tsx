import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Brain,
  Code,
  FileText,
  FlaskRoundIcon as Flask,
  Lightbulb,
  Microscope,
  Rocket,
  Share2,
  Shield,
  Zap,
  Users,
  Server,
  Speech,
  Film,
  Cpu,
  Focus,
  Loader,
  Mic,
  Nfc,
  Video,
  Tv,
  Image,
  ImagePlay,
  ImagePlus,
  Drama,
  BarChartIcon as ChartBar,
  ExternalLink,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import AIHero from "@/components/ai/ai-hero"
import ResearchPaper from "@/components/ai/research-paper"
import AIFeatureShowcase from "@/components/ai/ai-feature-showcase"
import DemoCard from "@/components/ai/demo-card"
import ResearchTimeline from "@/components/ai/research-timeline"
import ResearcherProfile from "@/components/ai/researcher-profile"
import TechStack from "@/components/tech-stack"

export const metadata: Metadata = {
  title: "AI Research & Development | RunAsh",
  description:
    "Explore RunAsh AI's cutting-edge research, technical papers, development roadmap, and interactive demos.",
}

export default function AIPage() {
  // Research papers data
  const papers = [
    {
      title: "Real-time AI-Powered Content Analysis for Live Streaming",
      authors: ["Ram Murmu", "Vaibhav Murmu", "P K Murmu"],
      date: "January 2025",
      conference: "Hugging Face",
      abstract:
        "This paper presents a novel approach to real-time content analysis for live streaming platforms using a lightweight transformer architecture optimized for edge devices.",
      link: "/research-paper",
      tags: ["Content Analysis", "Transformers", "Edge AI"],
    },
    {
      title: "Adaptive Bandwidth Optimization Using Predictive AI Models",
      authors: ["Ram Murmu", "Vaibhav Murmu", "P K Murmu"],
      date: "January 2025",
      conference: "Hugging Face",
      abstract:
        "We introduce an adaptive bandwidth optimization system that uses predictive AI models to anticipate streaming quality requirements based on content type and viewer engagement patterns.",
      link: "/research-paper",
      tags: ["Bandwidth Optimization", "Predictive Models", "Streaming Quality"],
    },
    {
      title: "Multi-modal Emotion Recognition for Enhanced Viewer Engagement",
      authors: ["Ram Murmu", "Vaibhav Murmu", "P K Murmu"],
      date: "January 2025",
      conference: "Hugging Face, Kaggle",
      abstract:
        "This research explores multi-modal emotion recognition techniques combining audio, visual, and textual data to enhance viewer engagement metrics in live streaming environments.",
      link: "/research-paper",
      tags: ["Emotion Recognition", "Action Recognition", "Multi-modal AI", "Engagement Metrics"],
    },
  ]

  // Demo data
  const demos = [
    {
      title: "Real-time Content Moderation",
      description:
        "See how our AI automatically detects and filters inappropriate content in real-time during live streams.",
      image: "/placeholder.svg?height=400&width=600",
      link: "#try-content-moderation",
      gradient: "from-orange-600 to-yellow-500",
      icon: <Shield className="h-6 w-6 text-white" />,
    },
    {
      title: "Smart Stream Enhancement",
      description:
        "Experience our AI-powered video enhancement that automatically improves lighting, reduces noise, and stabilizes video.",
      image: "/placeholder.svg?height=400&width=600",
      link: "#try-stream-enhancement",
      gradient: "from-orange-500 to-red-500",
      icon: <Zap className="h-6 w-6 text-white" />,
    },
    {
      title: "Audience Engagement Analysis",
      description: "Visualize how our AI analyzes viewer engagement patterns and provides real-time recommendations.",
      image: "/placeholder.svg?height=400&width=600",
      link: "#try-engagement-analysis",
      gradient: "from-yellow-500 to-orange-600",
      icon: <Users className="h-6 w-6 text-white" />,
    },
  ]

  // Research team data
  const researchers = [
    {
      name: "Ram Murmu",
      role: "Chief AI Researcher",
      image: "/rammurmu.jpg?height=300&width=300",
      bio: "Ram Murmu leads RunAsh's AI research team, focusing on real-time video analysis and content understanding.",
      publications: 0,
      citations: 0,
      links: {
        linkedin: "https://linkedin.com/in/rammurmu",
        twitter: "https://x.com/rammurmuu",
        googleScholar: "#",
      },
    },
    {
      name: "Vaibhav Murmu",
      role: "Principal Research Team Member",
      image: "/vaibhavmurmu.jpg?height=300&width=300",
      bio: "Vaibhav Murmu contribute in deep learning architectures for streaming media optimization and bandwidth prediction.",
      publications: 0,
      citations: 0,
      links: {
        linkedin: "https://linkedin.com/in/vaibhavmurmu",
        twitter: "https://x.com/vaibhavmurmu",
        googleScholar: "#",
      },
    },
    {
      name: "P K Murmu",
      role: "Researcher Team Members",
      image: "/placeholder.svg?height=300&width=300",
      bio: "P K Murmu focuses on multi-modal learning and emotion recognition systems for enhanced viewer engagement.",
      publications: 0,
      citations: 0,
      links: {
        linkedin: "#",
        twitter: "#",
        googleScholar: "#",
      },
    },
  ]

  // Tech stack data
  const techStack = [
    {
      title: "PyTorch",
      description: "Deep learning framework for our neural network models",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-orange-500 to-yellow-500",
    },
    {
      title: "TensorFlow",
      description: "Machine learning platform for production deployment",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      title: "ONNX Runtime",
      description: "Cross-platform inference acceleration",
      icon: <Rocket className="h-6 w-6 text-orange-500" />,
      gradient: "from-orange-600 to-yellow-600",
    },
    {
      title: "NVIDIA Triton",
      description: "Inference server for AI model deployment",
      icon: <Server className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-600 to-orange-600",
    },
    {
      title: "Hugging Face",
      description: "Machine learning platform for production deployment",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      title: "Kaggle",
      description: "Datasets, notebooks, and competitions for model evaluation",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      title: "Scikit-learn",
      description: "Machine learning in python",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      title: "Colab",
      description: "Collaborative notebook runtime for rapid model prototyping",
      icon: <Code className="h-6 w-6 text-orange-500" />,
      gradient: "from-yellow-500 to-orange-500",
    },
  ]

  const researchHubs = [
    {
      name: "Hugging Face",
      description: "Model repositories, open evaluations, and deployment-ready artifacts.",
      href: "https://huggingface.co/",
    },
    {
      name: "Google Colab",
      description: "Interactive notebooks for reproducible experiments and collaborative reviews.",
      href: "https://colab.research.google.com/",
    },
    {
      name: "Kaggle",
      description: "Public datasets and benchmark tasks to validate performance with transparent metrics.",
      href: "https://www.kaggle.com/",
    },
  ]

  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <AIHero />

      {/* Research Overview */}
      <section className="py-20 bg-gradient-to-b from-white to-orange-50 dark:from-gray-900 dark:to-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Microscope className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Research at RunAsh AI
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Our team of researchers and engineers are pushing the boundaries of AI for live streaming, focusing on
              real-time processing, content understanding, and viewer engagement.
            </p>
          </div>

          {/* Research Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Real-time AI Processing</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Developing efficient algorithms for real-time video and audio analysis that can run on edge devices with
                minimal latency.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Content Understanding</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Creating models that understand the context, content, and quality of streams to provide intelligent
                recommendations and enhancements.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Share2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Engagement Optimization</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Researching how AI can help creators maximize viewer engagement through content analysis, timing
                recommendations, and interactive features.
              </p>
            </div>
          </div>

          {/* Research Timeline */}
          <ResearchTimeline />
        </div>
      </section>
      {/* Research Overview */}
      <section className="py-20 bg-gradient-to-b from-white to-orange-50 dark:from-gray-900 dark:to-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              RunAsh AI Models 
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Our AI Models is built using the latest deep learning architectures and is optimized for performance and scalability.
                For Advanced Video Classification for Live Streaming.
            </p>
          </div>

          {/* Research Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Drama className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Live Streaming Action Recognition </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Real-time analysis of live stream for action detection 
              </p>
           <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Activity Recognition </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Identify and classify various activities in video content 
                
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <ImagePlus className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Object Detection </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Accurate detection and classification of objects within videos 
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Film className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Multimodel</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Video-Text-to-Text model take in a video chat and text prompt and output text.These model are call video language models.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Video-Text-to-Text</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This feature allows to analyze live streams and extract relevant text information in real-time.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn more <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Video className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Text-to-Video</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This feature enables to generate live streams from text inputs, allowing for automated content creation.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <ImagePlay className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Image-to-Video</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This feature enables you to generate live streams from image inputs, allowing for automated content creation.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Nfc className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Translation</h3>
              <p className="text-gray-700 dark:text-gray-300">
                 Our model supports real-time translation capabilities, allowing you to reach a global audience.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Speech className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Automatic Speech Recognition</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Our model supports TTS capabilities, allowing you to generate spoken language from text inputs in real-time.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow border border-orange-100 dark:border-orange-900/20">
              <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4 inline-block">
                <Speech className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Text-toSpeech</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This model supports TTS capabilities, allowing  to generate spoken language from text inputs in real-time.
              </p>
              <div className="flex justify-left mt-12">
            <Button
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              Learn More <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
            </div>
            
          </div>

          {/* Research Timeline */}
          
        </div>
      </section>



      
      {/* Technical Papers */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Technical Papers
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Our research team regularly publishes peer-reviewed papers in top AI conferences and journals.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {papers.map((paper, index) => (
              <ResearchPaper key={index} {...paper} />
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <Button
              asChild
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <Link href="/research-paper">
                View All Papers <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-white to-orange-50 dark:from-gray-900 dark:to-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Flask className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Research Platforms & Integrations
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Explore the ecosystem we use to build, validate, and ship production-ready AI features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            {researchHubs.map((hub) => (
              <article
                key={hub.name}
                className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-orange-100 dark:border-orange-900/20"
              >
                <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">{hub.name}</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">{hub.description}</p>
                <Link
                  href={hub.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-orange-600 dark:text-orange-400 font-semibold"
                >
                  Open {hub.name} <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white">
              <Link href="/integrations">Explore Integrations</Link>
            </Button>
            <Button asChild variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
              <Link href="/research-overview">Read Research Overview</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* AI Features Showcase */}
      <section className="py-20 bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              AI Features
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Discover how our AI technology enhances the live streaming experience for creators and viewers.
            </p>
          </div>

          <div className="space-y-24">
            <AIFeatureShowcase
              title="Real-time Content Analysis"
              description="Our AI analyzes video and audio in real-time to provide insights, content moderation, and enhancement suggestions without adding latency to your stream."
              image="/placeholder.svg?height=600&width=800"
              imageAlt="Real-time content analysis visualization"
              features={[
                "Automatic content categorization",
                "Inappropriate content detection",
                "Real-time transcription and translation",
                "Visual quality assessment",
              ]}
              icon={<Brain className="h-6 w-6 text-white" />}
              gradient="from-orange-500 to-yellow-500"
              direction="left"
            />

            <AIFeatureShowcase
              title="Smart Stream Enhancement"
              description="AI-powered tools that automatically enhance your stream quality, adjusting for lighting, audio clarity, and video stability in real-time."
              image="/placeholder.svg?height=600&width=800"
              imageAlt="Stream enhancement demonstration"
              features={[
                "Automatic lighting correction",
                "Background noise reduction",
                "Video stabilization",
                "Dynamic resolution optimization",
              ]}
              icon={<Zap className="h-6 w-6 text-white" />}
              gradient="from-yellow-500 to-orange-500"
              direction="right"
            />

            <AIFeatureShowcase
              title="Engagement Analytics"
              description="Advanced analytics powered by AI that help you understand viewer behavior, preferences, and engagement patterns to optimize your content."
              image="/placeholder.svg?height=600&width=800"
              imageAlt="Engagement analytics dashboard"
              features={[
                "Viewer sentiment analysis",
                "Content engagement prediction",
                "Optimal streaming time recommendations",
                "Personalized viewer insights",
              ]}
              icon={<ChartBar className="h-6 w-6 text-white" />}
              gradient="from-orange-600 to-yellow-600"
              direction="left"
            />
          </div>
        </div>
      </section>

      {/* Interactive Demos */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Flask className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Interactive Demos
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              Experience our AI technology firsthand with these interactive demonstrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {demos.map((demo, index) => (
              <DemoCard key={index} {...demo} />
            ))}
          </div>
        </div>
      </section>

      {/* Research Team */}
      <section className="py-20 bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Meet Our Research Team
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              The brilliant minds behind RunAsh's AI technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {researchers.map((researcher, index) => (
              <ResearcherProfile key={index} {...researcher} />
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link href="/careers">
              <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:opacity-90 text-white">
                Join Our Research Team
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 mb-4">
              <Code className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text mb-4">
              Our AI Technology Stack
            </h2>
            <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl">
              The cutting-edge technologies powering RunAsh's AI capabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {techStack.map((tech, index) => (
              <TechStack key={index} {...tech} />
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration CTA */}
      <section className="py-20 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-800 dark:via-orange-700 dark:to-yellow-700">
        <div className="container px-4 mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Collaborate With Our Research Team</h2>
            <p className="text-xl text-white/90 mb-8">
              We're always looking for research partners, academic collaborations, and industry experts to help advance
              the state of AI in live streaming technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-white text-orange-600 hover:bg-orange-50">Research Partnerships</Button>
              <Button variant="outline" className="border-white text-orange-600 hover:bg-white/10">
                Contact Research Team
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
