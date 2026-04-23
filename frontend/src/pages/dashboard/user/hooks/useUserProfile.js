import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMyProfile } from '../../../../api/authService'

function useUserProfile({ user, role, syncProfile, getApiErrorMessage }) {
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState('')

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true)
    setProfileError('')

    try {
      const data = await getMyProfile()
      setProfile(data)
      syncProfile(data)
    } catch (error) {
      setProfileError(getApiErrorMessage(error))
    } finally {
      setLoadingProfile(false)
    }
  }, [getApiErrorMessage, syncProfile])

  useEffect(() => {
    let isMounted = true

    const guardedLoad = async () => {
      setLoadingProfile(true)
      setProfileError('')

      try {
        const data = await getMyProfile()
        if (!isMounted) {
          return
        }

        setProfile(data)
        syncProfile(data)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setProfileError(getApiErrorMessage(error))
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
        }
      }
    }

    guardedLoad()

    return () => {
      isMounted = false
    }
  }, [getApiErrorMessage, syncProfile])

  const mergedProfile = useMemo(
    () => ({
      id: profile?.id || user?.id || null,
      fullName: profile?.fullName || user?.fullName || 'Student User',
      email: profile?.email || user?.email || 'student@campus.edu',
      role: profile?.role || role || 'USER',
      emailVerified:
        typeof profile?.emailVerified === 'boolean'
          ? profile.emailVerified
          : Boolean(user?.emailVerified),
      provider: profile?.provider || user?.provider || 'LOCAL',
      imageUrl: user?.imageUrl || '',
      phoneNumber: profile?.phoneNumber || user?.phoneNumber || '',
    }),
    [profile, role, user],
  )

  const studentId = useMemo(() => {
    if (!mergedProfile.id) {
      return 'ST-NA'
    }
    return `ST-${String(mergedProfile.id).padStart(6, '0')}`
  }, [mergedProfile.id])

  const initials = useMemo(() => {
    const parts = mergedProfile.fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) {
      return 'SU'
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('')
  }, [mergedProfile.fullName])

  return {
    initials,
    loadingProfile,
    mergedProfile,
    profileError,
    reloadProfile: loadProfile,
    studentId,
  }
}

export default useUserProfile

