const path = require('path')
const Koa = require('koa')
const fs = require('fs')
const cors = require('koa2-cors')
const router = require('koa-router')()

const app = new Koa()

app.use(cors({ origin: '*' }))
app.use(router.routes())
app.use(router.allowedMethods())
app.listen(10010)

const DOWNLOAD_DIR = 'download'

// 获取文件大小
router.get('/size/:name', (ctx) => {
  // 获取要下载文件的路径
  const filePath = path.resolve(__dirname, DOWNLOAD_DIR, ctx.params.name)
  const size = fs.statSync(filePath).size || 0
  ctx.body = {
    code: 200,
    data: size.toString(),
  }
})

router.get('/download/:name', async (ctx) => {
  try {
    const fileName = ctx.params.name
    // 获取文件的路径和文件的大小
    const filePath = path.resolve(__dirname, DOWNLOAD_DIR, fileName)
    const size = fs.statSync(filePath).size || 0
    // 获取请求头的 Range 字段
    const range = ctx.headers['range']
    console.log({ range })
    //没有 Range 字段, 则不使用分片下载, 直接传输文件
    if (!range) {
      ctx.set({
        'Content-Disposition': `attachment; filename=${fileName}`,
      })
      ctx.response.type = 'text/xml'
      ctx.response.body = fs.createReadStream(filePath)
    } else {
      // 获取分片的开始和结束位置
      const bytesRange = range.split('=')[1]
      let [start, end] = bytesRange.split('-')
      start = Number(start)
      end = Number(end)

      // 分片范围错误
      if (start > size || end > size) {
        ctx.set({ 'Content-Range': `bytes */${size}` })
        ctx.status = 416
        ctx.body = {
          code: 416,
          msg: 'Range 参数错误',
        }
        return
      }

      ctx.status = 206
      ctx.set({
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end ? end : size}/${size}`,
      })

      ctx.response.type = 'text/xml'
      ctx.response.body = fs.createReadStream(filePath, { start, end })
    }
  } catch (error) {
    console.log({ error })
    ctx.body = {
      code: 500,
      msg: error.message,
    }
  }
})
