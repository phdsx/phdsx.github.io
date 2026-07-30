(function () {
  const novels = {
    'zero-echo': {
      title: '零号回声',
      status: '连载中',
      chapters: [
        {
          title: '第一章 凌晨频段',
          date: '2026-07-15',
          paragraphs: [
            '凌晨两点十七分，北岭天文台那台退役了十二年的接收机忽然亮了。林渡正在地下机房换一枚保险丝，头顶的信号灯沿着走廊依次点亮，像有人从山顶一路走下来。',
            '值班系统没有报警。屏幕上只有一条窄得几乎看不见的波形，固定在零号测试频段。这个频段从不对外开放，通常只用于设备自检，更不该携带人声。',
            '林渡戴上耳机，先听见风，接着是密集的电流杂音。十三秒后，一个女人平静地说：“北区会在三点四十分断电。不要启动备用阵列。”',
            '录音到这里突然中止。文件自动生成的时间戳却不是今晚，而是十三年后的同一天。林渡以为时钟模块出了故障，直到三点四十分，山下整座北区同时熄灭。',
            '黑暗越过群山涌来，天文台的备用阵列开始自动预热。林渡站在控制台前，手指停在红色启动键上。耳机里，那段已经结束的录音又多出了一秒呼吸声。'
          ]
        },
        {
          title: '第二章 失效的时间戳',
          date: '2026-07-22',
          paragraphs: [
            '备用阵列最终没有启动。林渡拔掉主控钥匙，把异常录音复制到一块离线硬盘里。供电恢复后，系统日志显示凌晨两点到四点之间一切正常，仿佛那场停电只发生在人的记忆中。',
            '第二天，技术主管许岑带着一份设备报废单上山。他没有追问信号来源，只要求当天拆除零号接收机。林渡注意到报废单的审批日期同样来自十三年后。',
            '“时间戳可以伪造。”许岑把纸折进文件夹，“但巧合不会主动找上门。你昨晚听到的内容，不要再播放。”',
            '午后，林渡检查离线硬盘。录音波形比昨晚长了七分钟，新增部分没有声音，却藏着一串极弱的脉冲。他把间隔转成数字，得到一组城市电网坐标，以及明晚零点整的时间。',
            '坐标指向北区一座废弃的地下变电站。地图上，它已经停用十年；电网监控里，它却正以一座小城的规模持续耗电。'
          ]
        },
        {
          title: '第三章 城市静默',
          date: '2026-07-29',
          paragraphs: [
            '零点前十分钟，林渡抵达废弃变电站。铁门没有上锁，门后的灰尘里只有一串刚留下的脚印。脚印穿过空荡的配电大厅，在一面没有标记的墙前消失。',
            '墙后传来熟悉的低频震动，与零号接收机的底噪完全一致。林渡找到暗门，沿楼梯向下，看到数百台旧服务器在蓝色指示灯下运行。每一台屏幕上都显示着同一行字：回声同步中。',
            '许岑站在机柜尽头，像是早已等了很久。“那不是未来发来的预言，”他说，“是这座城市根据所有人的行为，计算出的下一种可能。”',
            '倒计时归零时，服务器同时安静下来。地面上的灯光一盏接一盏熄灭，这次没有任何警报，也没有备用电源启动。整座城市陷入一种经过精确设计的静默。',
            '林渡的手机在黑暗中亮起。屏幕上是一段尚未接收完成的新录音，发送者显示为他自己，日期仍然是十三年后。'
          ]
        }
      ]
    }
  };

  const params = new URLSearchParams(location.search);
  const novelId = params.get('id') || 'zero-echo';
  const novel = novels[novelId] || novels['zero-echo'];
  const requested = Number.parseInt(params.get('chapter') || '1', 10);
  const chapterIndex = Math.min(Math.max(Number.isFinite(requested) ? requested - 1 : 0, 0), novel.chapters.length - 1);
  const chapter = novel.chapters[chapterIndex];

  document.title = `${chapter.title} - ${novel.title} - PHDSX`;
  document.querySelector('[data-novel-title]').textContent = novel.title;
  document.querySelector('[data-novel-status]').textContent = novel.status;
  document.querySelector('[data-chapter-title]').textContent = chapter.title;
  document.querySelector('[data-chapter-meta]').textContent = chapter.date;
  document.querySelector('[data-reader-progress]').textContent = `第 ${chapterIndex + 1} / ${novel.chapters.length} 章`;

  const body = document.querySelector('[data-chapter-body]');
  body.replaceChildren(...chapter.paragraphs.map((text) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));

  document.querySelectorAll('[data-prev-chapter]').forEach((link) => {
    if (chapterIndex === 0) {
      link.setAttribute('aria-disabled', 'true');
      link.href = 'novels.html';
    } else {
      link.href = `novel-reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterIndex}`;
    }
  });
  document.querySelectorAll('[data-next-chapter]').forEach((link) => {
    if (chapterIndex === novel.chapters.length - 1) {
      link.textContent = '返回目录';
      link.href = 'novels.html';
    } else {
      link.href = `novel-reader.html?id=${encodeURIComponent(novelId)}&chapter=${chapterIndex + 2}`;
    }
  });

  localStorage.setItem(`phdsx-novel-progress-${novelId}`, String(chapterIndex + 1));
}());
