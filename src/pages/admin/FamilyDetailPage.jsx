import { useParams, Link } from 'react-router-dom'

export default function FamilyDetailPage() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin/families" className="text-gray-500 hover:text-gray-700">
          Families
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900">Family Details</span>
      </div>

      {/* Page content */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Family Management</h2>
        <p className="text-gray-600 mb-4">
          Family ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{id}</code>
        </p>
        <p className="text-gray-500">
          This page will display family details, roles, and allow management of credentials.
        </p>
      </div>
    </div>
  )
}
