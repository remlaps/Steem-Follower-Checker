document.getElementById('checkFollowers').addEventListener('click', function() {
  checkFollowers();
});

document.getElementById('accountName').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    checkFollowers();
  }
});

function checkFollowers() {
  const accountName = document.getElementById('accountName').value;
  if (accountName) {
    document.getElementById('progress').innerHTML = `<p><strong>Checking followers for account: ${accountName}</strong></p>`;
    getAccountAgeInDays(accountName).then(ageInDays => {
      getFollowers(accountName, ageInDays);
    }).catch(error => {
      console.error('Error fetching account age:', error);
      alert('Error fetching account age. Please try again.');
    });
  } else {
    alert('Please enter a Steemit account name.');
  }
}

async function getAccountAgeInDays(accountName) {
  const apiUrl = 'https://api.steemit.com';
  const requestData = {
    jsonrpc: "2.0",
    method: "condenser_api.get_accounts",
    params: [[accountName]],
    id: 1
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
  });

  const data = await response.json();
  const createdDate = new Date(data.result[0].created);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - createdDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

async function getFollowers(accountName, accountAgeInDays) {
  document.getElementById('results').innerHTML = '';
  document.getElementById('progress').innerHTML = '';

  let followers = [];
  let lastFollower = null;
  let previousLastFollower = null;
  let iterationCounter = 0;
  const limit = 100;

  while (true) {
    const params = JSON.stringify({
      jsonrpc: "2.0",
      method: "condenser_api.get_followers",
      params: [accountName, lastFollower, "blog", limit],
      id: 1
    });

    const response = await fetch('https://api.steemit.com', {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    const newFollowers = data.result;

    if (!newFollowers || newFollowers.length === 0) {
      break;
    }

    if (lastFollower && newFollowers[0].follower === lastFollower) {
      newFollowers.shift();
    }

    if (newFollowers.length > 0) {
      followers = followers.concat(newFollowers);
      previousLastFollower = lastFollower;
      lastFollower = newFollowers[newFollowers.length - 1].follower;
      iterationCounter++;

      if (iterationCounter === 5) {
        document.getElementById('progress').innerHTML = `<p><strong>Fetched ${followers.length} followers so far...</strong></p>`;
        iterationCounter = 0;
      }
    }

    if (newFollowers.length < limit - 1) {
      break;
    }

    if (lastFollower === previousLastFollower) {
      break;
    }
  }

  const totalFollowers = followers.length;
  const newFollowersPerMonth = (365.25 * totalFollowers) / (12 * accountAgeInDays);
  const reputations = followers.map(f => f.reputation).sort((a, b) => a - b);
  const medianReputation = calculateMedian(reputations);
  const followerStrength = calculateFollowerStrength(newFollowersPerMonth, medianReputation);

  document.getElementById('progress').innerHTML = '';
  document.getElementById('results').innerHTML = `
    <p><strong>Account Name:</strong> ${accountName}</p>
    <p><strong>Account Age in Days:</strong> ${accountAgeInDays}</p>
    <p><strong>Total Followers:</strong> ${totalFollowers}</p>
    <p><strong>New Followers per month:</strong> ${newFollowersPerMonth}</p>
    <p><strong>Median Follower Reputation:</strong> ${medianReputation.toFixed(2)}</p>
	
    <p><strong>Follower Network Strength:</strong> ${Number(followerStrength).toFixed(2)}</p>
  `;

  console.log(`Account Age in Days: ${accountAgeInDays}`);
  console.log(`Total Followers: ${totalFollowers}`);
  console.log(`Median Follower Reputation: ${medianReputation}`);
  console.log(`Follower Network Strength: ${followerStrength}`);
}

function calculateMedian(numbers) {
  const mid = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 0) {
    return (numbers[mid - 1] + numbers[mid]) / 2;
  } else {
    return numbers[mid];
  }
}

function calculateFollowerStrength(followerCount, medianReputation) {
  const maxFollowerCount = 60;
  const base = 30 - Math.min ( 30, followerCount / 20 );
  const maxReputation = Math.min(120, base + (120 - base)  * (Math.max(0, (maxFollowerCount - followerCount)) / maxFollowerCount));

  const threshold = 25;
  const minFollowers = 1;
  let normMedianReputation = 0;
  let normFollowerCount = 0;

  if (medianReputation > threshold && followerCount >= minFollowers) {
    // normMedianReputation = ((medianReputation - threshold) / (maxReputation - threshold));
	normMedianReputation = ((medianReputation - threshold) / maxReputation);
    normMedianReputation = Math.min(1, normMedianReputation);

    normFollowerCount = (followerCount - minFollowers) / (maxFollowerCount - minFollowers);
    normFollowerCount = Math.min(1, normFollowerCount);

    const distance = Math.sqrt(Math.pow(normFollowerCount, 2) + Math.pow(normMedianReputation, 2));
    console.log(`Normalized followers: ${normFollowerCount}, Normalized reputation: ${normMedianReputation}`);

    const strength = Math.max(distance, 0.01);
    return strength.toFixed(2);
  } else {
    return 0.01.toFixed(2);
  }
}

function getVersionNumber() {
  return chrome.runtime.getManifest().version;
}

function updatePopupVersion() {
  var versionElement = document.getElementById('version');
  if (versionElement) {
    versionElement.textContent = getVersionNumber();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  updatePopupVersion();
});
