import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminTestFileUrl, uploadAdminTestImage } from '../../../api/adminApi'
import useAuth from '../../../context/useAuth'
import { getHeaderLabelsByRole, getSidebarItemsByRole } from '../constants'
import UserDashboardHeader from '../user/components/UserDashboardHeader'
import UserSidebar from '../user/components/UserSidebar'

function AdminStorageTestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout, getApiErrorMessage } = useAuth()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadedInfo, setUploadedInfo] = useState(null)

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
    setErrorMessage('')
    setSuccessMessage('')
    setUploadedInfo(null)
  }

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!selectedFile) {
      setErrorMessage('Please select an image file first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await uploadAdminTestImage(selectedFile)
      setUploadedInfo(response)
      setSuccessMessage('Image uploaded to S3 successfully.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefreshUrl = async () => {
    if (!uploadedInfo?.key) {
      return
    }

    setIsRefreshingUrl(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const signed = await getAdminTestFileUrl(uploadedInfo.key)
      setUploadedInfo((previous) => ({
        ...previous,
        url: signed.url,
        expiresAt: signed.expiresAt,
      }))
      setSuccessMessage('Secure URL refreshed.')
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsRefreshingUrl(false)
    }
  }

  const sidebarItems = useMemo(
    () => getSidebarItemsByRole(role).map((item) => ({ ...item, active: item.path === location.pathname })),
    [location.pathname, role],
  )

  const headerLabels = getHeaderLabelsByRole(role)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <UserSidebar
        isSidebarExpanded={isSidebarExpanded}
        onCollapse={() => setIsSidebarExpanded(false)}
        onExpand={() => setIsSidebarExpanded(true)}
        onItemNavigate={(item) => item.path && navigate(item.path)}
        onLogout={handleLogout}
        sidebarItems={sidebarItems}
      />

      <div className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'}`}>
        <UserDashboardHeader eyebrow={headerLabels.eyebrow} title="S3 Upload Test" />

        <main className="mx-auto w-full max-w-3xl p-4 pb-24 md:p-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Admin Storage Test</h2>
            <p className="mt-1 text-sm text-slate-600">Upload a simple image to verify S3 integration from the admin panel.</p>

            <form onSubmit={handleUpload} className="mt-6 space-y-4">
              <div>
                <label htmlFor="test-image" className="mb-1 block text-sm font-medium text-slate-700">
                  Select Image
                </label>
                <input
                  id="test-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
                <p className="mt-1 text-xs text-slate-500">Supported: image files up to 5MB</p>
              </div>

              {errorMessage ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
              ) : null}

              {successMessage ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Image'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/users')}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Users
                </button>
              </div>
            </form>
          </section>

          {uploadedInfo ? (
            <section className="mt-4 rounded-2xl bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Upload Result</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Bucket:</span> {uploadedInfo.bucket}
                </p>
                <p>
                  <span className="font-medium">Key:</span> {uploadedInfo.key}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {uploadedInfo.contentType}
                </p>
                <p>
                  <span className="font-medium">Size:</span> {uploadedInfo.size} bytes
                </p>
                <p>
                  <span className="font-medium">URL:</span>{' '}
                  <a
                    href={uploadedInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-indigo-600 hover:underline"
                  >
                    {uploadedInfo.url}
                  </a>
                </p>
                <p>
                  <span className="font-medium">Expires At:</span>{' '}
                  {uploadedInfo.expiresAt ? new Date(uploadedInfo.expiresAt).toLocaleString() : 'N/A'}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleRefreshUrl}
                    disabled={isRefreshingUrl}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isRefreshingUrl ? 'Refreshing...' : 'Refresh Secure URL'}
                  </button>
                </div>
                {uploadedInfo.url ? (
                  <div className="pt-3">
                    <img
                      src={uploadedInfo.url}
                      alt="Uploaded test"
                      className="max-h-56 w-auto rounded-lg border border-slate-200 object-contain"
                    />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default AdminStorageTestPage


