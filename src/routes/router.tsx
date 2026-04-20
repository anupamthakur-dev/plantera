import { createBrowserRouter } from 'react-router-dom'
import Home from '../pages/Home'
import AuthPage from '../pages/Auth'
import ProfilePage from '../pages/Profile'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/profile/:userId',
    element: <ProfilePage />,
  },
])
