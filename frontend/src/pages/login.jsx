
const LoginPage = () => {
    const googleLogin = () => {
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
    }
    return (
        <div>
        <h2>Login</h2>
        <button onClick={googleLogin}>
            Login with Google
        </button>
        </div>
    )
}

export default LoginPage