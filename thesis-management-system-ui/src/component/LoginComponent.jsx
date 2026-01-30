import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginApi } from '../service/AuthService'

const LoginComponent = () => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const navigator = useNavigate()

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

            navigator("/importStudents")
            // window.location.reload(false)
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
                <div className="card shadow-lg border-0">
                <div className="card-body p-4">
                    <h3 className="text-center mb-4 text-primary fw-bold">
                    Thesis Management System
                    </h3>

                    {error && (
                    <div className="alert alert-danger d-flex align-items-center" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        {error}
                    </div>
                    )}

                    <form onSubmit={handleLoginForm}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold">
                        Username
                        </label>
                        <input
                        type="text"
                        name="username"
                        className="form-control form-control-lg"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                        Password
                        </label>
                        <input
                        type="password"
                        name="password"
                        className="form-control form-control-lg"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        />
                    </div>

                    <div className="d-grid">
                        <button
                        className="btn btn-primary btn-lg"
                        type="submit"
                        disabled={loading}
                        >
                        {loading ? (
                            <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Signing in...
                            </>
                        ) : (
                            "Sign In"
                        )}
                        </button>
                    </div>
                    </form>

                </div>
                </div>
            </div>
            </div>
        </div>
        );

}

export default LoginComponent