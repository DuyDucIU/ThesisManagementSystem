import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginApi } from '../service/AuthService'

const LoginComponent = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // const navigator = useNavigate()

    async function handleLoginForm(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        await loginApi(username, password).then(response => {
            console.log(response.data)

            // const token = 'Bearer ' + response.data.token
            // const role = response.data.role
            // storeToken(token)
            // saveLoggedInUser(username, role)

            // navigator("/")
            window.location.reload(false)
        }).catch(error => {
            console.error(error)
            const msg = error.response?.data?.message

            setError(msg)
            setLoading(false)
        })
    }

    return (
        <div className='page-container'>
            <div className='auth-container'>
                <div className='auth-card'>
                    <div className='auth-header'>
                        <h2>Thesis Management System</h2>
                        {/* <p>Sign in to continue to TaskFlow</p> */}
                    </div>

                    <div className='auth-body'>
                        <form className='auth-form' onSubmit={handleLoginForm}>
                            {error && (
                                <div className='form-group' style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(244, 63, 94, 0.1)',
                                    border: '1px solid rgba(244, 63, 94, 0.3)',
                                    borderRadius: '8px',
                                    color: '#f43f5e',
                                    fontSize: '0.9rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            <div className='form-group'>
                                <label className='form-label'>Username</label>
                                <input
                                    type='text'
                                    name='username'
                                    className='form-control'
                                    placeholder='Enter your username'
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className='form-group'>
                                <label className='form-label'>Password</label>
                                <input
                                    type='password'
                                    name='password'
                                    className='form-control'
                                    placeholder='Enter your password'
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                className='btn btn-primary'
                                type='submit'
                                disabled={loading}
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginComponent