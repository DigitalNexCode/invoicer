'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { FileText, Users, BarChart } from 'lucide-react'

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gradient-to-r from-blue-100 to-cyan-100">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold mb-4 text-blue-600">Welcome to Digital Invoicer</h1>
        <p className="mb-8 text-xl text-gray-600">Streamline your invoicing process with ease</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <Feature icon={FileText} title="Easy Invoicing" description="Create and manage invoices effortlessly" />
        <Feature icon={Users} title="Client Management" description="Keep track of your clients and their details" />
        <Feature icon={BarChart} title="Insightful Analytics" description="Gain valuable insights into your business" />
      </div>

      <div className="space-x-4">
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </div>
  )
}

function Feature({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md"
    >
      <Icon className="w-12 h-12 text-blue-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 text-center">{description}</p>
    </motion.div>
  )
}

