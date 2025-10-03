

export function Header() {
    return (
        <>
            <header className="header">
                <p className="devfolio">DEVFOLIO</p>
                <nav className="navbar">
                    <ul className="nav-list">
                        <li className="nav-items"><a href="#">Home</a></li>
                        <li className="nav-items"><a href="#">About</a></li>
                        <li className="nav-items"><a href="#">Projects</a></li>
                        <li className="nav-items"><a href="#">Contact</a></li>
                    </ul>
                </nav>
                <div className="ham">&#9776;</div>
            </header>
        </>
    );
}