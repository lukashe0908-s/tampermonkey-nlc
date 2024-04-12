import { useEffect, useRef, useState } from 'react';
import { Button, LinearProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { formatFileSize, fileConfigBlob, downloadFile } from './util';
import axios from 'axios';
import lodash from 'lodash';
import { pdfjs, Document, Page } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface configFromUri {
  aid?: string;
  bid?: string;
}

export default function Pdf() {
  let domain = `${process.env.NODE_ENV === 'development' ? 'http://localhost:12100/' : ''}http://read.nlc.cn`;
  const [configId, setConfigId] = useState<configFromUri>({});
  const [isLoading, setLoading] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [bookIndex, setBookIndex] = useState(0);
  const [config, setConfig] = useState<fileConfigBlob>();
  const [fileSize, setFilesize] = useState(0);
  const LoadingProgress = useRef();

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
  }, []);
  useEffect(() => {
    const ele = (LoadingProgress.current as HTMLElement | undefined)?.childNodes[0] as HTMLElement;
    ele.style.backgroundColor = '#745399';
  }, [LoadingProgress]);
  useEffect(() => {
    document.title = title + ' - ' + bookIndex;
  }, [title, bookIndex]);

  async function downloadElement(aid: string, bid: string): Promise<fileConfigBlob> {
    setDownloadProgress(0);
    let token_page = await (
      await fetch(`${domain}/OutOpenBook/OpenObjectBook?aid=${aid}&bid=${bid}`, {
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
      url: `${domain}/menhu/OutOpenBook/getReader?aid=${aid}&bid=${bid}&kime=${timeKey}&fime=${timeFlag}`,
      token: tokenKey,
      content: undefined as unknown as Blob,
      size: 0,
    };

    let content = await getArraybuffer();
    async function getArraybuffer(): Promise<[Blob, any]> {
      return new Promise(async (resolve, reject) => {
        axios
          .get(config.url, {
            headers: {
              myreader: config.token,
            },
            responseType: 'blob',
            onDownloadProgress: progressEvent => {
              let percentCompleted = progressEvent.progress! * 100;
              setDownloadProgress(percentCompleted);
            },
          })
          .then(res => {
            const { data, headers } = res;
            const blob = new Blob([data], { type: 'application/pdf' });
            resolve([blob, (headers as any).get('content-length')]);
          })
          .catch(e => {
            reject(e);
          });
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
          value={downloadProgress}
        ></LinearProgress>
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
            <div className='normal-case flex gap-2 text-white'>
              <div className='px-1 rounded-md bg-blue-600'>{bookIndex.toString().padStart(4, '0')}</div>
              <div className='px-1 rounded-md bg-cyan-600'>{formatFileSize(fileSize)}</div>
            </div>
          </div>
          <div className='float-right'>
            <Button
              variant='contained'
              onClick={() => {
                downloadFile(config?.content!, bookIndex, title, 'pdf', !(bookIndex === 0));
              }}
            >
              <DownloadIcon></DownloadIcon>
            </Button>
          </div>
        </div>
        <PdfContent content={config!.content} className=''></PdfContent>
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
      <iframe src={url} frameBorder='0' className='w-full h-full'></iframe>
    </div>
  );
}
