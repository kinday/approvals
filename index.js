const fetch = require('node-fetch')
const {json} = require('micro')

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'Authorization': `token ${process.env.GH_TOKEN}`,
}

function isApproved(review) {
  return 'APPROVED' === review.state.toUpperCase()
}

function getNextUrl(linkHeader) {
  const matches = /^<([^<>]+)>; rel="next"/.exec(linkHeader)

  return matches && matches[1]
}

function fetchApi(url, body) {
  return fetch(url, {body, headers, method: body ? 'POST' : 'GET'})
    .then((res) => {
      const link = getNextUrl(res.headers.get('Link'))

      if (!link) {
        return res.json()
      }

      return res.json()
        .then(json => fetchApi(link, body).then(rest => (json || []).concat(rest)))
    })
}

module.exports = async function reviews(req, res) {
  const body = await json(req)

  const repoUrl = body.repository.url
  const pullRequestNumber = body.pull_request.number
  const reviewsApiUrl = `${repoUrl}/pulls/${pullRequestNumber}/reviews`
  const sha = body.pull_request.head.sha
  const statusApiUrl = `${repoUrl}/statuses/${sha}`

  const reviews = await fetchApi(reviewsApiUrl)

  const hasEnoughApprovals = reviews && reviews.filter(isApproved).length > 1
  const statusBody = {
    state: hasEnoughApprovals ? 'success' : 'error',
    description: hasEnoughApprovals ? 'LGTM' : 'Not enough approvals',
    context: 'code-review/approvals'
  }

  const response = await fetchApi(statusApiUrl, JSON.stringify(statusBody))

  res.end(JSON.stringify(response))
}
