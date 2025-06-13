villageData = null;
game_history = [];
is_wait_response = false;

function appendHistoryItem(item, msg) {
  game_history.push(item);
  if (msg) {
    output.innerHTML += `<p>${msg}</p>`;
  }
  scrollOutputToEnd();
}

async function performAction(action) {
  appendHistoryItem({'role':'user','content':`Your action: ${action}`}, action);
  showLoading();
  hideNextActions();
  is_wait_response = true;
  const inputData = constructPlayGameInputData();
  try {
    const response = await fetch(`${api_base}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(inputData, null, "")
    });
    if (!response.ok) {
      throw Error(response.statusText);
    }

    let p = document.createElement('p');
    output.appendChild(p);

    // Streaming read the response.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let textChunk = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      hideLoading();
      if (readerDone) {
        done = true;
        break;
      }

      textChunk += decoder.decode(value);

      // Assume json objects of textChunk is seperated by '\n'.
      const matches = textChunk.split('\n');

      let partial = false, part_content = '';
      for (let i = 0; i < matches.length; i++) {
        try {
          const json_response = JSON.parse(matches[i]);
          const this_content = json_response.message.content;
          part_content += this_content;
          if (json_response.done) {
            done = true;
            break;
          }
        } catch (error) {
          partial = true;
          if (0 < i) {
            const lastMatchIndex = textChunk.lastIndexOf(matches[i]);
            textChunk = textChunk.substring(lastMatchIndex + matches[i].length);
          }
        }
      }

      p.innerHTML += part_content;
      scrollOutputToEnd();
  
      if (!partial) {
        const lastMatchIndex = textChunk.lastIndexOf(matches[matches.length - 1]);
        textChunk = textChunk.substring(lastMatchIndex + matches[matches.length - 1].length);
      }
    }

    // Parse full_content of response and update <p> again.
    const obj = JSON.parse(p.innerHTML);
    output.removeChild(p);
    const content = JSON.stringify(obj, null, ""); // Remove indent spaces.
    appendHistoryItem({'role':'assistant','content':content}, obj.result);
    if (obj.next_actions) {
      showNextActions(obj.next_actions);
    }

    is_wait_response = false;
  } catch (error) {
    hideLoading();
    output.innerHTML += 'Error:' + error;
    scrollOutputToEnd();
    is_wait_response = false;
  }
}

const canvas = document.getElementById("myCanvas");
canvas.addEventListener('mousemove', onCanvasMouseMove);
canvas.addEventListener('mousedown', onCanvasMouseDown);
const ctx = canvas.getContext("2d");

const right_column = document.getElementById('right-column');
const output = document.getElementById('output');

// Create town.
output.innerHTML += '<p>生成場景</p>';

fetch(`${api_base}/api/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(create_town_data, null, "")
})
.then(response => response.json())
.then(data => {
  // Draw village.
  if (canvas && ctx) {
    hideLoading();
    applyVillageData(data.message.content);
  } else {
    console.error("Canvas element not found or context not supported.");
  }
})
.catch(error => {
  hideLoading();
  output.innerHTML = 'Error:' + error;
});

function applyVillageData(content) {
  appendHistoryItem({'role':'assistant','content':content}, null);
  villageData = JSON.parse(content);
  document.getElementById('name').innerHTML = villageData.name;
  drawVillage(villageData, canvas, ctx);
  output.innerHTML += `<p>${villageData.description}</p>`;
}

var tooltip = document.createElement('div');
tooltip.setAttribute('id', 'tooltip');
tooltip.classList.add('tooltip');

function drawCharCenter(ctx, x, y, s) {
  ctx.font = "32px Arial";
  ctx.fillStyle = "black";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(s, x * 32 + 16, y * 32 + 16);
}

// Function to draw the village on the canvas
function drawVillage(villageData, canvas, ctx) {
  const buildings = villageData.buildings;
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
  buildings.forEach((building) => {
    const x = building.x;
    const y = building.y;
    drawCharCenter(ctx, x, y, building.emoji);
  });
}

function onCanvasMouseMove(event) {
  if (null == villageData) {
    return;
  }
  var xscale = canvas.width / canvas.scrollWidth;
  var yscale = canvas.height / canvas.scrollHeight;
  var mouseX = (event.clientX - canvas.offsetLeft) * xscale;
  var mouseY = (event.clientY - canvas.offsetTop) * yscale;
  var a = villageData.buildings;
  for (var i = 0; i < a.length; i++) {
    var b = a[i];
    if (32 * b.x <= mouseX && mouseX <= 32 * b.x + 32 && 32 * b.y <= mouseY && mouseY <= 32 * b.y + 32) {
      tooltip.innerHTML = `<strong>${b.emoji}${b.name}</strong><br>${b.description}`;
      tooltip.style.top = `${canvas.offsetTop + Math.floor(32 * b.y / xscale)}px`;
      tooltip.style.left = `${canvas.offsetLeft + Math.floor((32 * b.x + 40) / yscale)}px`;
      document.body.appendChild(tooltip);
      return;
    }
  }
  // hide the tooltip if the mouse is not within the rectangle
  if (document.getElementById('tooltip')) {
    document.body.removeChild(tooltip);
  }
}

function onCanvasMouseDown(event) {
  if (null == villageData || is_wait_response) {
    return;
  }
  var mouseX = (event.clientX - canvas.offsetLeft) * canvas.width / canvas.scrollWidth;
  var mouseY = (event.clientY - canvas.offsetTop) * canvas.height / canvas.scrollHeight;
  var a = villageData.buildings;
  for (var i = 0; i < a.length; i++) {
    var b = a[i];
    if (32 * b.x <= mouseX && mouseX <= 32 * b.x + 32 && 32 * b.y <= mouseY && mouseY <= 32 * b.y + 32) {
      performAction(`拜訪 "${b.emoji}${b.name}"`);
      return;
    }
  }
}

function scrollOutputToEnd() {
  right_column.scrollTop = right_column.scrollHeight;
}

function showLoading() {
  document.getElementById('loading').style.display = 'block';
  scrollOutputToEnd();
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function showNextActions(next_actions) {
  let html = '';
  for (let i = 0; i < next_actions.length; i++) {
    html += ` <button type="button" onclick="performAction('${next_actions[i]}')">${next_actions[i]}</button> `;
  }
  const div = document.getElementById('next_actions');
  div.style.display = 'block';
  div.innerHTML = html;
  scrollOutputToEnd();
}

function hideNextActions() {
  const div = document.getElementById('next_actions');
  div.style.display = 'none';
  div.innerHTML = '';
}
