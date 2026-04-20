(function () {
    const appId = 'QMq4HFQshcHbTkGqUoX10lDK-gzGzoHsz';
    const appKey = 'MgjYDq8Uwr9g8x8HEJ24tyEB';
    const serverURL = 'https://qmz4hfqs.lc-cn-n1-shared.com';

    const pagePath = window.location.pathname;
    const localKey = 'liked_' + pagePath;
    const maxLikes = 50;
    const headers = {
      'X-LC-Id': appId,
      'X-LC-Key': appKey,
      'Content-Type': 'application/json'
    };

    async function fetchLike() {
      const res = await fetch(`${serverURL}/1.1/classes/Like?where=` + encodeURIComponent(JSON.stringify({ path: pagePath })), { headers });
      const data = await res.json();
      if (data.results.length > 0) {
        return data.results[0];
      } else {
        const resNew = await fetch(`${serverURL}/1.1/classes/Like`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            path: pagePath,
            count: 0,
            ACL: {
              "*": {
                "read": true,
                "write": true
              }
            }
          })
        });
        return await resNew.json();
      }
    }

    async function increaseLike(objectId) {
      await fetch(`${serverURL}/1.1/classes/Like/${objectId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ count: { __op: 'Increment', amount: 1 } })
      });
    }

    document.addEventListener('DOMContentLoaded', async () => {
      const icon = document.getElementById('like-icon');
      const count = document.getElementById('like-count');
      const likedCount = parseInt(localStorage.getItem(localKey) || '0');

      const data = await fetchLike();
      count.textContent = data.count || 0;

      icon.addEventListener('click', async () => {
        let current = parseInt(localStorage.getItem(localKey) || '0');
        if (current >= maxLikes) return;

        icon.classList.add('clicked');
        setTimeout(() => icon.classList.remove('clicked'), 400);

        count.textContent = parseInt(count.textContent) + 1;
        localStorage.setItem(localKey, current + 1);
        await increaseLike(data.objectId);
      });
    });
  })();