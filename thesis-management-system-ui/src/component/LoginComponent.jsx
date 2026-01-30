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
        <div className="container min-vh-100 d-flex justify-content-center align-items-center">
            <div className="row w-100 justify-content-center">
                <div className="col-md-5 col-lg-4">
                    <div className="card shadow">
                        <div className="card-body">
                            <h3 className="text-center mb-4">
                                Thesis Management System
                            </h3>

                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLoginForm}>
                                <div className="mb-3">
                                    <label className="form-label">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        className="form-control"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        className="form-control"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="d-grid">
                                    <button
                                        className="btn btn-primary"
                                        type="submit"
                                        disabled={loading}
                                    >
                                        {loading ? 'Signing in...' : 'Sign In'}
                                    </button>
                                </div>
                            </form>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginComponent