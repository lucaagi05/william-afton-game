window.interactions = [
  {
    id: 'cube_item',
    type: 'text',
    get area() { return window.cubeInteractionBox; },
    trigger: function() { return true; },
    text: {
      pages: [
        "Hi cod.",
        "You may be wondering why I revived William Afton's account.",
        "Mainly because Discord sent me an email reminding me the account was going to be deleted",
        "but also to retrieve some old stuff I made for the arg...",
        "like this game.",
        "Scrapped it out of disinterst...do you think it has potential for something?"
      ],
      font: '25px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    },
    type: 'text'
  },
  {
    id: 'checkpoint_left',
    type: 'choice',
    get area() { return window.checkpointHitbox; },
    trigger: function() { return true; },
    choice: {
      prompt: "Want to save your progress?",
      options: ["Yes", "No"],
      font: '20px monospace',
      color: '#fff',
      frame: { fill: '#222', outline: '#fff', height: 120, margin: 16 }
    }
  }
];