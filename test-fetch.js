const http = require('http')

http.get('http://localhost:3001/api/formulario/prefill?id=2835', (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => console.log(JSON.parse(data)))
}).on('error', err => console.log(err))
