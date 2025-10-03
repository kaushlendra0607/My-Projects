

export function About() {
    return (
        <>
            <section className="about">
                <h1 className="primary-heading">About Me</h1>
                <p className="intro">
                    As an Engineer and passionate learner with curiosity for technology and problem solving,
                    I love creating and building impactful projects.
                </p>
                <p>
                    My journey in software development began about two years ago, and since then I've been
                    consistently learning and exploring the tech world. Over time, I have built a strong
                    foundation in web development, and I'm currently also exploring artificial intelligence
                    and machine learning.
                </p>
                <p>
                    I enjoy solving problems and turning ideas into real-world implementations. Beyond coding,
                    I believe in lifelong learning — whether that's improving my technical skills, strengthening
                    soft skills, or simply becoming a better human being. As I continue my journey, I look forward
                    to opportunities where I can grow further, contribute to meaningful projects, and collaborate
                    with passionate individuals.
                </p>

                <section className="skills">
                    <h1>Technical Skills</h1>
                    <ul className="grid-four-columns">
                        <li>
                            <i className="fa-brands fa-python skill-logo"></i>
                            <p>
                                Python was the first programming language I learned back in 9th grade.
                                It opened the door to software development for me, and today I have a
                                solid foundation in Python and use it regularly for problem solving and
                                data analysis.
                            </p>
                        </li>
                        <li>
                            <i className="fa-brands fa-html5 skill-logo"></i>
                            <p>
                                HTML was my entry point into web development. I have practiced it extensively
                                and continue to refine my knowledge, as it is the backbone of every web project.
                            </p>
                        </li>
                        <li>
                            <i className="fa-brands fa-css3 skill-logo"></i>
                            <p>
                                Along with HTML, I learned CSS to style and design web pages.
                                I enjoy the creative side of web design and have a strong command
                                of CSS for building responsive and visually appealing layouts.
                            </p>
                        </li>
                        <li>
                            <i className="fa-brands fa-square-js skill-logo"></i>
                            <p>
                                JavaScript opened a whole new world of possibilities for me.
                                I use it for both frontend and backend development, creating dynamic
                                and interactive web applications.
                            </p>
                        </li>
                        <li>
                            <i className="fa-brands fa-react skill-logo"></i>
                            <p>
                                After learning the core web technologies, I started working with React.js
                                and built several projects that strengthened my understanding of component-based
                                development and state management.
                            </p>
                        </li>
                        <li>
                            <i className="fa-brands fa-node skill-logo"></i>
                            <p>
                                Moving into backend development, I learned Node.js and Express.js
                                to build scalable server-side applications and APIs, preparing me for
                                industry-level development.
                            </p>
                        </li>
                        <li>
                            <i className="fa-solid fa-laptop-code skill-logo"></i>
                            <p>
                                I am currently improving my C++ skills to become better at problem solving
                                and competitive programming. I'm also exploring Python libraries like NumPy,
                                Pandas, and Matplotlib to strengthen my foundations in AI and ML.
                            </p>
                        </li>
                    </ul>
                </section>
            </section>
        </>
    );
}