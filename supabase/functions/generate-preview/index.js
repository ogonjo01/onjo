import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import { fromBuffer } from 'pdf2pic'
import fetch from 'node-fetch'

export default async (req, res) => {
  const { url } = req.body;
  
  try {
    // Download PDF
    const response = await fetch(url)
    const pdfBuffer = await response.buffer()
    
    // Convert to image
    const options = { 
      density: 100, 
      format: 'jpeg', 
      width: 800,
      height: 600,
      quality: 80
    }
    const convert = fromBuffer(pdfBuffer, options)
    const { base64 } = await convert(1, true)  // First page
    
    res.status(200).json({ preview: base64 })
  } catch (error) {
    console.error('Preview generation error:', error)
    res.status(500).json({ error: 'Preview generation failed' })
  }
}