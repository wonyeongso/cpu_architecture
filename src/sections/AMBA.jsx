export default function AMBA() {
  return (
    <>
      <h2>AMBA 계열 <span className="en">/ Protocol Stack</span></h2>
      <p>ARM이 정의한 SoC 내부 표준 버스. 용도와 속도에 따라 여러 프로토콜이 있음.</p>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Protocol</th><th>용도</th><th>특징</th></tr></thead>
          <tbody>
            <tr><td><b>APB</b></td><td>Peripheral</td><td>저속, 단순 (register 접근)</td></tr>
            <tr><td><b>AHB / AHB-Lite</b></td><td>중속 interconnect</td><td>Single channel, pipelined</td></tr>
            <tr><td><b>AXI4 / AXI4-Lite</b></td><td>고속 memory / DMA</td><td>5 채널, OoO, burst</td></tr>
            <tr><td><b>ACE / ACE-Lite</b></td><td>Coherent L2 / L3</td><td>AXI + snoop channels</td></tr>
            <tr><td><b>CHI</b></td><td>Mesh, Neoverse</td><td>Packet-based, scalable</td></tr>
          </tbody>
        </table>
      </div>

      <h2>AXI4 5-채널 <span className="en">/ Five Channels</span></h2>
      <div className="bus-diagram">
        <div className="bus-ch"><div className="name">AR</div><div className="dir">M → S · Read Address</div></div>
        <div className="bus-ch"><div className="name">R</div><div className="dir">S → M · Read Data + Resp</div></div>
        <div className="bus-ch"><div className="name">AW</div><div className="dir">M → S · Write Address</div></div>
        <div className="bus-ch"><div className="name">W</div><div className="dir">M → S · Write Data</div></div>
        <div className="bus-ch"><div className="name">B</div><div className="dir">S → M · Write Response</div></div>
      </div>
      <p>각 채널은 <code>VALID / READY</code> 핸드셰이크. 독립적이라 write address를 먼저 보내고 data는 나중에, 또는 read 여러 개를 outstanding으로 발사 가능.</p>

      <h2>주요 필드 <span className="en">/ Key Signals</span></h2>
      <pre><code>
<span className="reg">ARID / AWID</span>        <span className="cmt">{"// 트랜잭션 ID — 같은 ID는 순서 유지, 다른 ID는 OoO 허용"}</span>{"\n"}
<span className="reg">ARADDR / AWADDR</span>    <span className="cmt">{"// 시작 주소"}</span>{"\n"}
<span className="reg">ARLEN / AWLEN</span>      <span className="cmt">{"// burst length (beat 수 - 1)"}</span>{"\n"}
<span className="reg">ARSIZE / AWSIZE</span>    <span className="cmt">{"// beat당 바이트 (2^size)"}</span>{"\n"}
<span className="reg">ARBURST / AWBURST</span>  <span className="cmt">{"// FIXED / INCR / WRAP"}</span>{"\n"}
<span className="reg">ARCACHE / AWCACHE</span>  <span className="cmt">{"// bufferable / cacheable 속성"}</span>{"\n"}
<span className="reg">ARPROT / AWPROT</span>    <span className="cmt">{"// [0]priv [1]NS [2]instr"}</span>{"\n"}
<span className="reg">WSTRB</span>              <span className="cmt">{"// byte enable per beat"}</span>{"\n"}
<span className="reg">BRESP / RRESP</span>      <span className="cmt">{"// OKAY / EXOKAY / SLVERR / DECERR"}</span>
      </code></pre>

      <h2>ACE 추가 채널 <span className="en">/ Snoop Extensions</span></h2>
      <pre><code>
<span className="cmt">{"// Master (CPU, snoop 받는 쪽) 관점:"}</span>{"\n"}
<span className="reg">AC</span>    <span className="cmt">{"// Snoop address — interconnect → master"}</span>{"\n"}
<span className="reg">CR</span>    <span className="cmt">{"// Snoop response"}</span>{"\n"}
<span className="reg">CD</span>    <span className="cmt">{"// Snoop data (dirty line 제공 시)"}</span>
      </code></pre>

      <h2>CHI <span className="en">/ Coherent Hub Interface</span></h2>
      <p>Neoverse의 메시 인터커넥트 (CMN-600 / 650 / 700)에서 사용. 채널이 아니라 <b>packet</b> 기반 (<code>REQ / RSP / DAT / SNP</code>). Scalable하며 distributed cache directory 지원.</p>
    </>
  )
}
