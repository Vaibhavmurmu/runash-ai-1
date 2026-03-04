"use client"

import { Button } from "@/components/ui/button"
import { Mail, MessageSquare, Phone, Clock, HelpCircle, ArrowRight } from "lucide-react"
import ContactForm from "@/components/contact-form"
import ContactMethod from "@/components/contact-method"
import FaqItem from "@/components/faq-item"
import OfficeLocation from "@/components/office-location"
import ThemeToggle from "@/components/theme-toggle"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-950 dark:via-orange-950/30 dark:to-gray-950"></div>

        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-10 left-10 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-40 left-1/4 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-block mb-6 px-6 py-2 border border-orange-500/30 rounded-full bg-orange-500/10 backdrop-blur-sm">
              <span className="text-orange-600 dark:text-orange-400">Get In Touch</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Contact Our Team
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
              Have questions about our AI streaming platform? We're here to help you get started.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-yellow-500/20 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-orange-500/20 to-transparent blur-3xl"></div>

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Form */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                {/* Gradient border */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/50 via-yellow-500/50 to-orange-500/50 dark:from-orange-500/30 dark:via-yellow-500/30 dark:to-orange-500/30 rounded-xl p-[1px]">
                  <div className="absolute inset-0 bg-white dark:bg-gray-900 backdrop-blur-sm rounded-xl"></div>
                </div>

                <div className="relative p-8 rounded-xl">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                    Send Us a Message
                  </h2>
                  <ContactForm />
                </div>
              </div>
            </div>

            {/* Contact Methods */}
            <div className="order-1 lg:order-2">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                How to Reach Us
              </h2>
              <div className="space-y-6">
                <ContactMethod
                  icon={<Mail className="h-6 w-6 text-white" />}
                  title="Email Us"
                  description="Our team typically responds within 24 hours."
                  contact="contact@runash.in"
                  gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                />
                <ContactMethod
                  icon={<Phone className="h-6 w-6 text-white" />}
                  title="Call Us"
                  description="Available Monday-Friday, 9am-5pm PST."
                  contact="+91 (06542) 253096"
                  gradient="from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400"
                />
                <ContactMethod
                  icon={<MessageSquare className="h-6 w-6 text-white" />}
                  title="Live Chat"
                  description="Get immediate assistance from our support team."
                  contact="Available 24/7"
                  gradient="from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400"
                  action={
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
                    onClick={() => router.push("/live-chat")}
                    >
                      Start Chat
                    </Button>
                  }
                />
              </div>

              <div className="mt-12 pt-12 border-t border-orange-200 dark:border-orange-900/30">
                <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Follow Us</h3>
                <div className="flex space-x-4">
                  {["twitter", "instagram", "youtube", "discord"].map((platform) => (
                    <a
                      key={platform}
                      href={`https://${platform}.in/runash`}
                      className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/50 dark:to-yellow-900/50 border border-orange-200 dark:border-orange-800/30 flex items-center justify-center hover:border-orange-500/70 dark:hover:border-orange-500/70 transition-colors"
                    >
                      <span className="text-orange-600 dark:text-orange-400 capitalize">{platform.charAt(0)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-20 bg-gradient-to-b from-white via-orange-50/50 to-white dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950 relative">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5"></div>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Our Offices
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              We are a remote-first company, that's working in different location.Visit us at one of our global virtual locations or schedule a virtual meeting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <OfficeLocation
              city="Bharat (India)"
              address="310 RunAsh AI Corporate Avenue, Bokaro, JH 827014"
              phone="+91 (06542) 253096"
              email="contact@runash.in"
              image="/placeholder.svg?height=200&width=400"
              hours="Mon-Fri: 9am-5pm PST"
            />
            <OfficeLocation
              city="Bharat (India)"
              address=" RunAsh AI Tech Avenue, Ranchi, JH 834001"
              phone="+91 8987724121"
              email="contact@runash.in"
              image="/placeholder.svg?height=200&width=400"
              hours="Mon-Fri: 9am-5pm GMT"
            />
            <OfficeLocation
              city="Singapore (Remote)"
              address="New ton Road 307987"
              phone="+91 8987724121 "
              email="singapore@runash.in"
              image="/placeholder.svg?height=200&width=400"
              hours="Mon-Fri: 9am-5pm JST"
            />
            <OfficeLocation
              city="San Francisco (Remote)"
              address="Stripe Atlas, Dalaware San Francisco, CA "
              phone="+91 8987724121 "
              email="sf@runash.in"
              image="/placeholder.svg?height=200&width=400"
              hours="Mon-Fri: 9am-5pm JST"
            />
          </div>

          {/* World Map */}
          <div className="mt-16 relative">
            <div className="aspect-[21/9] rounded-xl overflow-hidden border border-orange-200 dark:border-orange-800/30">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100/20 via-white to-yellow-100/20 dark:from-orange-900/20 dark:via-gray-900 dark:to-yellow-900/20"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full max-w-4xl">
                  {/* World map visualization - simplified for this example */}
                  <div className="relative w-full h-full">
                    {/* Bharat (India) marker */}
                    <div className="absolute left-[20%] top-[40%]">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400 animate-ping absolute"></div>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400 relative"></div>
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Bharat</span>
                      </div>
                    </div>
                    {/* Singapore marker */}
                    <div className="absolute left-[45%] top-[35%]">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 animate-ping absolute"></div>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-400 dark:to-orange-400 relative"></div>
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Singapore</span>
                      </div>
                    </div>
                    {/* San Francisco marker */}
                    <div className="absolute left-[80%] top-[40%]">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400 animate-ping absolute"></div>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 dark:from-orange-400 dark:to-yellow-400 relative"></div>
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="text-sm font-medium text-orange-600 dark:text-orange-400">San Francisco </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-yellow-500/20 to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-orange-500/20 to-transparent blur-3xl"></div>

        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              Find quick answers to common questions about our platform and services.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <FaqItem
              question="How quickly can I get started with RunAsh AI?"
              answer="You can sign up and start streaming with our AI enhancements in less than 5 minutes. Our onboarding process is designed to be quick and intuitive."
            />
            <FaqItem
              question="What kind of hardware do I need to use your platform?"
              answer="Our platform works with standard streaming equipment. For basic streaming, you'll need a computer with a modern web browser, a webcam, and a microphone. For professional streaming, we recommend a dedicated camera and microphone setup."
            />
            <FaqItem
              question="Do you offer custom enterprise solutions?"
              answer="Yes, we offer tailored enterprise solutions for businesses with specific needs. Contact our sales team to discuss your requirements and get a custom quote."
            />
            <FaqItem
              question="How does your AI enhance my streams?"
              answer="Our AI technology enhances video quality, reduces background noise, optimizes bandwidth usage, provides real-time translations, and offers smart audience engagement tools, all without requiring technical expertise from you."
            />
            <FaqItem
              question="What platforms can I stream to using RunAsh?"
              answer="RunAsh integrates with all major streaming platforms including Twitch, YouTube, Facebook Live, Instagram Live, and TikTok. You can stream to multiple platforms simultaneously with our Professional and Enterprise plans."
            />
          </div>
        </div>
      </section>

      {/* Support Options */}
      <section className="py-20 bg-gradient-to-b from-white via-orange-50/50 to-white dark:from-gray-950 dark:via-orange-950/20 dark:to-gray-950 relative">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5"></div>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
              Support Options
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              Choose the support option that works best for you and your team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/50 via-yellow-500/50 to-orange-500/50 dark:from-orange-500/30 dark:via-yellow-500/30 dark:to-orange-500/30 rounded-xl opacity-30 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8 bg-white dark:bg-gray-900 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-800/30 group-hover:border-orange-500/30 dark:group-hover:border-orange-500/30 transition-colors duration-300 h-full">
                <div className="mb-5 p-3 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/50 dark:to-yellow-900/50 rounded-lg inline-block">
                  <HelpCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Help Center</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Browse our comprehensive knowledge base with tutorials, guides, and troubleshooting tips.
                </p>
                <Button
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50 w-full"
                 onClick={() => router.push("/help")}
                >
                  Visit Help Center <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/50 via-yellow-500/50 to-orange-500/50 dark:from-orange-500/30 dark:via-yellow-500/30 dark:to-orange-500/30 rounded-xl opacity-30 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8 bg-white dark:bg-gray-900 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-800/30 group-hover:border-orange-500/30 dark:group-hover:border-orange-500/30 transition-colors duration-300 h-full">
                <div className="mb-5 p-3 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50 rounded-lg inline-block">
                  <MessageSquare className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Community Forum</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Connect with other creators, share tips, and get advice from our community experts.
                </p>
                <Button
                  variant="outline"
                  className="border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950/50 w-full"
                 onClick={() => router.push("/community")}
                >
                  Join Community <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/50 via-yellow-500/50 to-orange-500/50 dark:from-orange-500/30 dark:via-yellow-500/30 dark:to-orange-500/30 rounded-xl opacity-30 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-8 bg-white dark:bg-gray-900 backdrop-blur-sm rounded-xl border border-orange-200/50 dark:border-orange-800/30 group-hover:border-orange-500/30 dark:group-hover:border-orange-500/30 transition-colors duration-300 h-full">
                <div className="mb-5 p-3 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/50 dark:to-yellow-900/50 rounded-lg inline-block">
                  <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Priority Support</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Get dedicated support with faster response times and personalized assistance.
                </p>
                <Button className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white w-full"
                onClick={() => router.push("/upgrade")}
                >
                  Upgrade Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/70 via-yellow-100/70 to-orange-100/70 dark:from-orange-900/30 dark:via-yellow-900/30 dark:to-orange-900/30"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-10"></div>

        <div className="container relative z-10 mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/80 to-orange-50/80 dark:from-gray-900/80 dark:to-orange-950/80 border border-orange-200/50 dark:border-orange-800/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 dark:from-orange-400 dark:via-orange-300 dark:to-yellow-300 text-transparent bg-clip-text">
                Ready to Transform Your Streams?
              </h2>
              <p className="text-gray-700 dark:text-gray-300 text-lg max-w-2xl mx-auto">
                Join thousands of content creators who are already using our AI-powered platform to create stunning live
                streams.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 dark:from-orange-500 dark:to-yellow-500 dark:hover:from-orange-600 dark:hover:to-yellow-600 text-white"
                onClick={() => router.push("/stream")}
              >
                Start Streaming Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/50"
                onClick={() => router.push("/schedule")}
              >
                Schedule a Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white dark:bg-gray-950 border-t border-orange-200/50 dark:border-orange-900/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/about"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="/press"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Press
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 text-transparent bg-clip-text">
                Product
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/features"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="/integrations"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 dark:from-orange-400 dark:to-yellow-400 text-transparent bg-clip-text">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/docs"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="/tutorials"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Tutorials
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/brand"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Brand Assets
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 dark:from-yellow-400 dark:to-orange-400 text-transparent bg-clip-text">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/contact"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-gray-500">
            <p>© {new Date().getFullYear()} RunAsh AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
