import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export default function PDFSummaryButton({ selector = 'main', filename = '课堂总结.pdf' }) {
  const onExport = async () => {
    try {
      const el = document.querySelector(selector)
      if (!el) return
      const canvas = await html2canvas(el, { backgroundColor: '#0f172a', scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ unit: 'px', format: 'a4' })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // 适配图片到单页
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
      const w = canvas.width * ratio
      const h = canvas.height * ratio
      const x = (pageWidth - w) / 2
      const y = 12
      pdf.addImage(imgData, 'PNG', x, y, w, h)
      pdf.save(filename)
    } catch (e) {
      console.error('导出失败', e)
    }
  }

  return (
    <button
      type="button"
      onClick={onExport}
      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm"
    >
      导出课堂总结 PDF
    </button>
  )
}


