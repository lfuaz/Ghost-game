# 👻 Ghost Game Online

Welcome to my Ghost Game Online: a web version of the classic word game that will haunt your lexicon! 🎯

## 🎮 How to Play

I've created a digital version of Ghost, a word game where players take turns adding a letter to a growing word fragment. In my version, the goal is to complete a valid word! 🤔

### Rules:
1. 👤 We take turns adding one letter to a growing word fragment.
2. 📝 Each addition must form part of a valid French word.
3. ⚠️ When I add a letter that forms a valid word (3+ letters), I win that round!
4. 🧠 If challenged, I must defend my move by showing that my letter addition can lead to a valid word.
5. ⏱️ I have 10 seconds to respond to a challenge, or I lose the round.
6. 🏳️ I can surrender my turn if I'm stuck.
7. 🎯 My goal is to be strategic with my letters to form complete words.

### Example Round:
- I play: "G" 🔤
- My friend plays: "H" (Thinking of "GHOST") 💭
- I play: "O" (Thinking of "GHOST") 💭
- My friend plays: "S" (Thinking of "GHOST") 💭
- I play: "T" → Forms "GHOST", a valid word! ✅
- I win this round! 🏆
- If challenged, I would need to prove I can extend "GHOST" into a longer valid word.

## ✨ Key Features

I've included these exciting features in my game:

- **🌐 Multiplayer in Real-time**: I can play with my friends from all over the world!
- **🏠 Room-based Gameplay**: I can join or create game rooms with unique names.
- **💾 Player Persistence**: My session is saved between visits.
- **🔍 Word Validation**: My words are automatically checked for validity in French.
- **⚔️ Challenge System**: I enjoy time-limited challenges after completing words.
- **📜 Game History**: I can keep track of my previous rounds and words.
- **🚦 Ready System**: I wait for all my friends to be ready before we start.
- **📱 Responsive Design**: I can play on my desktop or mobile with ease.
- **🎊 Victory Celebrations**: I get a confetti explosion when I win!

## 🛠️ Technologies I Used

### Frontend
- **⚛️ React 19**: I built the interactive UI with this
- **🔌 Socket.io Client**: I implemented realtime communication with the server
- **🎨 Sass**: I created powerful styling using variables and mixins
- **⚡ Vite**: I achieved rapid development and optimized builds
- **🎉 React Confetti**: I added celebratory win animations 

### Backend
- **🟢 Node.js**: I used this JavaScript runtime for the server
- **🚂 Express**: I chose this web application framework
- **📡 Socket.io**: I implemented real-time events over WebSockets
- **📚 TextGears API**: I integrated this French word validation service
- **⚡ Node-Cache**: I improved performance with word validation caching

### Deployment
- **🐳 Docker**: I containerized my deployment
- **🔄 Docker Compose**: I composed my services together
- **🔧 GitHub Actions**: I automated my CI/CD process
- **🔐 Traefik**: I managed reverse proxy and SSL certificates

## 🚀 Why I Created Ghost Game

Why did I make a computer version of Ghost? Because I believe vocabulary games are like ghosts - they never really die! 👻

I brought this classic word game into the digital age with real-time multiplayer support. 🌍 I wanted to challenge vocabulary and problem-solving skills while providing a light-hearted, easy-to-use experience. 🧩

I put a twist on the traditional Ghost rules - in my version, completing a word means victory, not defeat! I think this makes the game more intuitive and rewards vocabulary knowledge. 🧠

And I love showing off my vocabulary skills by forming clever words while my friends frantically try to block me! 😈

## 💡 My Personal Development Challenge

This project was more than just creating a game—it was my self-driven coding challenge! I wanted to:

- **🤖 Explore AI-Assisted Development**: I intentionally used AI generative coding tools like GitHub Copilot to accelerate development and learn modern patterns. It was fascinating to see how AI could help implement complex features while still requiring my guidance and refinement.

- **📡 Master WebSockets Bidirectional Communication**: I had always been curious about building real-time applications, and this project pushed me to deeply understand Socket.io's bidirectional nature. Learning to manage both server-to-client and client-to-server events simultaneously was particularly challenging, especially when synchronizing game state across multiple players. I had to rethink my approach to data flow, moving from traditional request-response patterns to event-driven architecture.

- **🔄 Maintain Consistent State**: The bidirectional nature of WebSockets required careful planning to prevent state desynchronization. I needed to implement robust error handling and reconnection strategies to ensure players always saw the same game state, even when network issues occurred.

- **🌐 Self-Directed Learning**: Without a formal specification, I challenged myself to envision, plan, and execute the entire project—from initial concept to deployment—improving my project management skills.

- **🧩 Solve Complex State Management**: Game development presents unique challenges in state synchronization across multiple clients, which greatly improved my understanding of event-driven architecture and real-time systems.

This project helped me grow significantly as a developer and showed me that combining traditional coding skills with modern AI tools can lead to more rapid innovation while still requiring deep technical understanding of bidirectional communication patterns.

## 👋 Let's Play!

I invite you to visit [ghostgame.florianurena.ovh](https://ghostgame.florianurena.ovh) and bring your friends for a wits-and-words game night! 🎲

Remember: In my version of Ghost, every letter matters, and the one who completes the word wins the game! I think it's hauntingly fun! 👻
