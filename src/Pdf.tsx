import { useEffect, useRef, useState } from 'react';
import { Button, LinearProgress, Checkbox, FormGroup, FormControlLabel } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { formatFileSize, fileConfigBlob, downloadFile } from './util';
import { getItemValue, setItemValue } from './util';

interface configFromUri {
  aid?: string;
  bid?: string;
}

export default function Pdf() {
  let domain = `${process.env.NODE_ENV === 'development' ? 'http://localhost:12100/' : ''}http://read.nlc.cn`;
  const [configId, setConfigId] = useState<configFromUri>({});
  const [isLoading, setLoading] = useState(true);
  const [useOrigin, setUseOrigin] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [bookIndex, setBookIndex] = useState(0);
  const [config, setConfig] = useState<fileConfigBlob>();
  const [fileSize, setFilesize] = useState(0);
  const LoadingProgress = useRef(0);

  useEffect(() => {
    const foo = window.location.href.match(/\/OutOpenBook\/OpenObjectBook\?aid=([0-9]*?)&bid=([0-9.]*)/);
    const bar = {
      aid: foo![1],
      bid: foo![2],
    };
    setConfigId(bar);
    (async () => {
      setLoading(true);
      //   return;
      const config = await downloadElement(bar.aid, bar.bid);
      setConfig(config);
      setFilesize(config.size);
      setLoading(false);
    })();
    if (getItemValue('pdf/useOrigin')!) setUseOrigin(getItemValue('pdf/useOrigin')!);
  }, []);
  useEffect(() => {
    const ele = (LoadingProgress.current as any)?.childNodes[0] as HTMLElement;
    ele.style.backgroundColor = '#745399';
  }, [LoadingProgress]);
  useEffect(() => {
    document.title = title + ' - ' + bookIndex;
  }, [title, bookIndex]);

  async function downloadElement(aid: string, bid: string): Promise<fileConfigBlob> {
    setDownloadProgress(0);
    let token_page = await (
      await fetch(`${domain}/OutOpenBook/OpenObjectBook?aid=${aid}&bid=${bid}`, {
        cache: 'no-cache',
        referrerPolicy: 'no-referrer',
      })
    ).text();
    let tokenKey = token_page.match(/tokenKey="([^"]*?)"/)![1];
    let timeKey = token_page.match(/timeKey="([^"]*?)"/)![1];
    let timeFlag = token_page.match(/timeFlag="([^"]*?)"/)![1];
    let title = token_page.match(/var title = '(.*)';/)![1];
    setTitle(title.trim());
    try {
      let index = token_page.match(/var pdfname= '.*_([0-9]+)\.pdf';/)![1];
      setBookIndex(Number(index));
    } catch (error: any) {
      console.error(token_page.match(/var pdfname= '(.*?)\.pdf';/)![1], error.message);
    }
    let config: fileConfigBlob = {
      url: `${domain}/menhu/OutOpenBook/getReaderNew?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`,
      token: tokenKey,
      content: undefined as unknown as Blob,
      size: 0,
    };

    let content = await getArraybuffer();
    async function getArraybuffer(): Promise<[Blob, any]> {
      return new Promise(async (resolve, reject) => {
        let response = await fetch(`${domain}/menhu/OutOpenBook/getReaderNew?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`, {
          method: 'GET',
          referrer: 'http://read.nlc.cn/static/webpdf/lib/WebPDFJRWorker.js',
          headers: {
            myreader: tokenKey,
          },
        });

        const reader = response.body!.getReader();
        const contentLength: any = response.headers.get('Content-Length');
        let receivedLength = 0;
        let chunks = [];
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          console.log(`Received ${receivedLength} of ${contentLength}`);
          let percentCompleted = (receivedLength / contentLength) * 100;
          setDownloadProgress(percentCompleted);
        }

        const data = new Blob(chunks, { type: 'application/pdf' });
        resolve([data, contentLength]);
      });
    }
    if (content[1] === 0) throw new Error(`下载失败,返回空`);
    config.content = content[0];
    config.size = content[1];
    return config;
  }

  return isLoading ? (
    <>
      <div className='flex flex-col h-full bg-[#2A2A2E] text-white'>
        <LinearProgress
          ref={LoadingProgress}
          className='w-full !h-2 !bg-transparent'
          variant='determinate'
          value={downloadProgress}></LinearProgress>
        <div className='flex flex-col items-center justify-center h-full'>
          <span className='text-4xl font-bold'>加载中</span>
        </div>
      </div>
    </>
  ) : (
    <>
      <div className='flex flex-col h-full overflow-auto'>
        <div className='sticky flex gap-4 p-2 bg-[#745399] z-[100] top-0 text-white'>
          <div className='flex gap-4 w-full items-center'>
            <h1 className='text-xl'>{title}</h1>
            <div className='normal-case flex gap-2 text-white flex-wrap'>
              <div className='px-1 rounded-md bg-blue-600'>{bookIndex.toString().padStart(4, '0')}</div>
              <div className='px-1 rounded-md bg-cyan-600'>{formatFileSize(fileSize)}</div>
            </div>
          </div>
          <div className='float-right flex items-center'>
            <FormControlLabel
              className='select-none text-nowrap'
              control={
                <Checkbox
                  checked={useOrigin}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setUseOrigin(event.target.checked);
                    setItemValue('pdf/useOrigin', event.target.checked);
                  }}
                />
              }
              label='使用浏览器PDF阅读器'
            />
            <Button
              variant='contained'
              onClick={() => {
                downloadFile(config?.content!, bookIndex, title, 'pdf', !(bookIndex === 0));
              }}>
              <DownloadIcon></DownloadIcon>
            </Button>
          </div>
        </div>
        {useOrigin ? <PdfContentOrigin content={config!.content}></PdfContentOrigin> : <PdfContent content={config!.content}></PdfContent>}
      </div>
    </>
  );
}
function PdfContent({ content, className }: { content: Blob; className?: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    setUrl(URL.createObjectURL(content));
  }, [content]);
  return (
    <div className={'h-full ' + className}>
      {url ? <iframe src={'/pdfReader/?file=' + url} frameBorder='0' className='w-full h-full bg-[#2A2A2E] text-white'></iframe> : ''}
    </div>
  );
}

function PdfContentOrigin({ content, className }: { content: Blob; className?: string }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    setUrl(URL.createObjectURL(content));
  }, [content]);
  return (
    <div className={'h-full ' + className}>
      <iframe src={url} frameBorder='0' className='w-full h-full'></iframe>
    </div>
  );
}
