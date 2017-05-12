if (typeof process.env.GH_TOKEN !== 'string') {
  throw new Error('GH_TOKEN is required')
}

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `token ${process.env.GH_TOKEN}`,
}

function isApproved(review) {
  return 'APPROVED' === review.state.toUpperCase()
}

function fetchApi(url, body) {
  return fetch(url, {body, headers})
}

module.exports = async function reviews(req, res) => {
  const body = await json(req)

  const repoUrl = body.repository.url
  const pullRequestNumber = body.pull_request.number
  const reviewsApiUrl = `${repoUrl}/pulls/${pullRequestNumber}/reviews`
  const sha = body.pull_request.head.sha
  const statusApiUrl = `${repoUrl}/statuses/${sha}`

  const reviews = await fetchApi(reviewsApiUrl).then((res) => res.json())

  const hasEnoughApprovals = reviews.filter(isApproved).length > 1
  const statusBody = {
    state: hasEnoughApprovals ? 'success' : 'error',
    description: hasEnoughApprovals ? 'LGTM' : 'Not enough approvals',
    context: 'code-review/approvals'
  }

  await fetchApi(statusApiUrl, statusBody)

  res.end()
}