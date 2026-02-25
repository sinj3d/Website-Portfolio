export default function ResumePage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-6xl h-[85vh] sm:h-[90vh] shadow-2xl rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <object
                    data="/resume.pdf"
                    type="application/pdf"
                    className="w-full h-full rounded-xl"
                >
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
                        <p className="text-xl font-medium text-gray-700">
                            It appears your browser doesn't support inline PDFs.
                        </p>
                        <a
                            href="/resume.pdf"
                            download
                            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 hover:shadow transition-all"
                        >
                            Download Resume PDF
                        </a>
                    </div>
                </object>
            </div>
            <div className="mt-4 text-sm text-gray-500">
                <a href="/" className="hover:text-blue-600 transition-colors">
                    &larr; Back to Home
                </a>
            </div>
        </div>
    );
}
